import { Command } from "commander";

import { enforceGuard, preflight, resolveTarget, type GuardFlags, type Intensity, type Target } from "./config.js";
import { getDocs, type Docs } from "./gql.js";
import {
  buildReport,
  compareToBaseline,
  loadBaseline,
  printMetrics,
  saveBaseline,
  writeReport,
  type MetricValue
} from "./report.js";
import { makeCtx, type ScenarioContext } from "./scenarios/support.js";
import { ServerMetricsSampler } from "./server-metrics.js";

interface SharedOpts {
  target?: string;
  report?: string;
  saveBaseline?: boolean;
  compare?: boolean;
  compareTolerance: string;
  compareFloorMs: string;
  fullPayload?: boolean;
  verbose?: boolean;
  yes?: boolean;
  yesIAmLoadTestingProduction?: boolean;
  forceIntensity?: boolean;
  timeoutMs: string;
  serverProfile: string;
}

function addSharedOptions(cmd: Command): Command {
  return cmd
    .option("--target <url>", "server base URL (default: STRESS_TARGET_URL or http://localhost:8000)")
    .option("--report <path>", "write the run report to this path")
    .option("--save-baseline", "promote this run's report to the committed baseline")
    .option("--no-compare", "skip baseline comparison even when a baseline exists")
    .option("--compare-tolerance <pct>", "p95 regression tolerance in percent", "20")
    .option(
      "--compare-floor-ms <ms>",
      "absolute p95 delta a regression must also exceed (absorbs scheduler jitter)",
      "15"
    )
    .option("--full-payload", "use client-fidelity fat fragments instead of lean selections")
    .option("--timeout-ms <ms>", "per-operation timeout", "5000")
    .option("--server-profile <name>", "informational: cargo profile the server was built with", "release")
    .option("--yes", "skip confirmation prompts (baseline overwrite)")
    .option("--yes-i-am-load-testing-production", "required to run against a non-local target")
    .option("--force-intensity", "do not clamp intensity on remote targets")
    .option("--verbose", "per-step logging");
}

export interface ScenarioOutcome {
  metrics: Record<string, MetricValue>;
  series?: Record<string, unknown>;
  /** Scenario-level failure independent of baseline comparison (e.g. smoke assertions) */
  ok: boolean;
}

function guardFlags(opts: SharedOpts): GuardFlags {
  return {
    yesIAmLoadTestingProduction: opts.yesIAmLoadTestingProduction,
    forceIntensity: opts.forceIntensity
  };
}

/**
 * Shared run pipeline: resolve target → prod guard (may clamp intensity) →
 * health preflight → sample /metrics while the scenario runs → report →
 * baseline compare/save. Baseline params come from paramsOf(clamped) so they
 * always reflect what actually ran.
 */
async function execute(
  scenario: string,
  opts: SharedOpts,
  intensity: Intensity,
  paramsOf: (clamped: Intensity) => Record<string, unknown>,
  run: (ctx: ScenarioContext, clamped: Intensity) => Promise<ScenarioOutcome>
): Promise<never> {
  const target: Target = resolveTarget(opts.target);
  const clamped = await enforceGuard(target, guardFlags(opts), intensity);
  await preflight(target);

  const docs: Docs = getDocs(Boolean(opts.fullPayload));
  const ctx = makeCtx(target, docs, Number(opts.timeoutMs), Boolean(opts.verbose));
  const sampler = new ServerMetricsSampler(target.metricsUrl);

  console.log(`\n=== ${scenario} → ${target.httpUrl} (${target.label}) ===`);
  const startedAt = Date.now();
  sampler.start();
  let outcome: ScenarioOutcome;
  try {
    outcome = await run(ctx, clamped);
  } finally {
    sampler.stop();
  }
  const durationMs = Date.now() - startedAt;

  if (sampler.looksStale(durationMs)) {
    console.warn(
      "warning: server gauges never changed during the run — start the server with HEARTBEAT_INTERVAL_SECS=1 for real samples."
    );
  }
  const slope = sampler.memorySlopeMiBPerMin();
  if (slope !== null) {
    outcome.metrics["serverMemSlopeMiBPerMin"] = slope;
    // Short runs legitimately grow memory (rooms, chat history); slope only
    // means anything on sustained runs.
    if (slope > 5 && durationMs > 5 * 60_000) {
      console.warn(`warning: server memory grew ${slope} MiB/min during the run — possible leak.`);
    }
  }

  const report = buildReport({
    scenario,
    target: target.label,
    params: { ...paramsOf(clamped), fullPayload: Boolean(opts.fullPayload) },
    serverProfile: opts.serverProfile,
    metrics: outcome.metrics,
    server: sampler.summary(),
    series: outcome.series
  });

  printMetrics(outcome.metrics, sampler.summary());
  const reportFile = writeReport(report, opts.report);
  console.log(`report: ${reportFile}`);

  let comparePass = true;
  if (opts.compare !== false) {
    const baseline = loadBaseline(scenario, target.label);
    if (baseline) {
      comparePass = compareToBaseline(
        report,
        baseline,
        Number(opts.compareTolerance),
        Number(opts.compareFloorMs)
      ).pass;
    } else {
      console.log(`no baseline for ${scenario}.${target.label} — run with --save-baseline to create one.`);
    }
  }
  if (opts.saveBaseline) {
    await saveBaseline(report, Boolean(opts.yes));
  }

  process.exit(outcome.ok && comparePass ? 0 : 1);
}

const program = new Command()
  .name("stress")
  .description("Protocol-level stress tests for Summit Planning Poker");

addSharedOptions(
  program
    .command("smoke")
    .description("harness self-test: 5 VUs, one room, full vote/reveal/chat round-trip")
    .option("--players <n>", "number of virtual users", "5")
).action(async (opts: SharedOpts & { players: string }) => {
  const { runSmoke } = await import("./scenarios/smoke.js");
  await execute(
    "smoke",
    opts,
    { vus: Number(opts.players), durationSec: 15 },
    (c) => ({ players: c.vus }),
    (ctx, c) => runSmoke(ctx, { players: c.vus })
  );
});

addSharedOptions(
  program
    .command("vote-cycle")
    .description("N players vote → reveal → reset repeatedly in one room")
    .option("--players <n>", "players in the room", "30")
    .option("--cycles <n>", "vote/reveal/reset cycles", "20")
).action(async (opts: SharedOpts & { players: string; cycles: string }) => {
  const { runVoteCycleScenario } = await import("./scenarios/vote-cycle.js");
  const cycles = Number(opts.cycles);
  await execute(
    "vote-cycle",
    opts,
    { vus: Number(opts.players), durationSec: 120 },
    (c) => ({ players: c.vus, cycles }),
    (ctx, c) => runVoteCycleScenario(ctx, { players: c.vus, cycles })
  );
});

addSharedOptions(
  program
    .command("chat-storm")
    .description("chat messages at a target rate; measures send latency + propagation")
    .option("--players <n>", "players in the room", "20")
    .option("--rate <msgsPerSec>", "messages per second across the room", "10")
    .option("--ramp <rates>", 'comma-separated rates to sweep, e.g. "5,10,25,50"')
    .option("--duration <s>", "seconds per rate", "30")
).action(async (opts: SharedOpts & { players: string; rate: string; ramp?: string; duration: string }) => {
  const { runChatStorm } = await import("./scenarios/chat-storm.js");
  const requestedRates = opts.ramp ? opts.ramp.split(",").map(Number) : [Number(opts.rate)];
  await execute(
    "chat-storm",
    opts,
    { vus: Number(opts.players), durationSec: Number(opts.duration), chatRatePerSec: Math.max(...requestedRates) },
    (c) => ({
      players: c.vus,
      rates: requestedRates.map((r) => Math.min(r, c.chatRatePerSec ?? r)),
      durationSec: c.durationSec
    }),
    (ctx, c) =>
      runChatStorm(ctx, {
        players: c.vus,
        rates: requestedRates.map((r) => Math.min(r, c.chatRatePerSec ?? r)),
        durationSec: c.durationSec
      })
  );
});

addSharedOptions(
  program
    .command("room-capacity")
    .description("ramp players into one room until latency degrades; reports max players")
    .option("--max-players <n>", "stop ramping here even without degradation", "300")
    .option("--step <n>", "players added per step", "10")
    .option("--settle-ms <ms>", "wait after each batch before probing", "1500")
    .option("--join-p95-ms <ms>", "join latency threshold", "500")
    .option("--prop-p95-ms <ms>", "probe propagation threshold", "750")
).action(
  async (
    opts: SharedOpts & { maxPlayers: string; step: string; settleMs: string; joinP95Ms: string; propP95Ms: string }
  ) => {
    const { runRoomCapacity } = await import("./scenarios/room-capacity.js");
    const thresholds = {
      step: Number(opts.step),
      settleMs: Number(opts.settleMs),
      joinP95Ms: Number(opts.joinP95Ms),
      propP95Ms: Number(opts.propP95Ms)
    };
    await execute(
      "room-capacity",
      opts,
      { vus: Number(opts.maxPlayers), durationSec: 600 },
      (c) => ({ maxPlayers: c.vus, ...thresholds }),
      (ctx, c) => runRoomCapacity(ctx, { maxPlayers: c.vus, ...thresholds })
    );
  }
);

addSharedOptions(
  program
    .command("multi-room")
    .description("many rooms × few players voting concurrently — broker fan-out + mutex contention")
    .option("--rooms <n>", "number of rooms", "50")
    .option("--players-per-room <n>", "players in each room", "4")
    .option("--cycles <n>", "vote cycles per room", "5")
).action(async (opts: SharedOpts & { rooms: string; playersPerRoom: string; cycles: string }) => {
  const { runMultiRoom } = await import("./scenarios/multi-room.js");
  const playersPerRoom = Number(opts.playersPerRoom);
  const cycles = Number(opts.cycles);
  await execute(
    "multi-room",
    opts,
    { vus: Number(opts.rooms) * playersPerRoom, durationSec: 300 },
    (c) => ({ rooms: Math.max(1, Math.floor(c.vus / playersPerRoom)), playersPerRoom, cycles }),
    (ctx, c) =>
      runMultiRoom(ctx, { rooms: Math.max(1, Math.floor(c.vus / playersPerRoom)), playersPerRoom, cycles })
  );
});

addSharedOptions(
  program
    .command("soak")
    .description("sustained mixed load; watches server memory slope for leaks")
    .option("--players <n>", "total players", "40")
    .option("--rooms <n>", "rooms to spread them across", "5")
    .option("--duration <s>", "soak duration in seconds", "900")
).action(async (opts: SharedOpts & { players: string; rooms: string; duration: string }) => {
  const { runSoak } = await import("./scenarios/soak.js");
  const rooms = Number(opts.rooms);
  await execute(
    "soak",
    opts,
    { vus: Number(opts.players), durationSec: Number(opts.duration) },
    (c) => ({ players: c.vus, rooms, durationSec: c.durationSec }),
    (ctx, c) => runSoak(ctx, { players: c.vus, rooms, durationSec: c.durationSec })
  );
});

addSharedOptions(
  program
    .command("seed")
    .description("hold N VUs in an EXISTING room with light vote/chat traffic until killed")
    .requiredOption("--room <roomId>", "room to join (must already exist)")
    .option("--players <n>", "VUs to hold in the room", "40")
    .option("--chat-rate <msgsPerSec>", "background chat rate", "2")
    .option("--vote-interval-ms <ms>", "average time between random votes", "2000")
).action(
  async (opts: SharedOpts & { room: string; players: string; chatRate: string; voteIntervalMs: string }) => {
    const { runSeed } = await import("./scenarios/seed.js");
    const target = resolveTarget(opts.target);
    const clamped = await enforceGuard(target, guardFlags(opts), {
      vus: Number(opts.players),
      durationSec: 60,
      chatRatePerSec: Number(opts.chatRate)
    });
    await preflight(target);
    const ctx = makeCtx(target, getDocs(Boolean(opts.fullPayload)), Number(opts.timeoutMs), Boolean(opts.verbose));
    await runSeed(ctx, {
      roomId: opts.room,
      players: clamped.vus,
      chatRatePerSec: clamped.chatRatePerSec ?? 0,
      voteIntervalMs: Number(opts.voteIntervalMs)
    });
  }
);

addSharedOptions(
  program
    .command("rooms-capacity")
    .description("ramp the number of concurrent active rooms until latency degrades; reports max rooms")
    .option("--max-rooms <n>", "stop ramping here even without degradation", "300")
    .option("--step <n>", "rooms added per step", "25")
    .option("--players-per-room <n>", "players in each room", "4")
    .option("--mut-p95-ms <ms>", "mutation latency threshold", "150")
    .option("--prop-p95-ms <ms>", "probe propagation threshold", "300")
).action(
  async (
    opts: SharedOpts & {
      maxRooms: string;
      step: string;
      playersPerRoom: string;
      mutP95Ms: string;
      propP95Ms: string;
    }
  ) => {
    const { runRoomsCapacity } = await import("./scenarios/rooms-capacity.js");
    const playersPerRoom = Number(opts.playersPerRoom);
    const thresholds = {
      step: Number(opts.step),
      playersPerRoom,
      mutP95Ms: Number(opts.mutP95Ms),
      propP95Ms: Number(opts.propP95Ms),
      probeRooms: 5
    };
    await execute(
      "rooms-capacity",
      opts,
      { vus: Number(opts.maxRooms) * playersPerRoom, durationSec: 600 },
      (c) => ({ maxRooms: Math.max(1, Math.floor(c.vus / playersPerRoom)), ...thresholds }),
      (ctx, c) =>
        runRoomsCapacity(ctx, { maxRooms: Math.max(1, Math.floor(c.vus / playersPerRoom)), ...thresholds })
    );
  }
);

addSharedOptions(
  program
    .command("throughput")
    .description("ramp raw mutation rate until the latency knee; reports max sustained calls/sec")
    .option("--rooms <n>", "rooms in the sender pool", "10")
    .option("--players-per-room <n>", "players (senders/subscribers) per room", "5")
    .option("--rates <list>", "comma-separated mutation rates to sweep", "50,100,200,400,800,1600")
    .option("--stage-sec <s>", "seconds per rate stage", "8")
    .option("--knee-p95-ms <ms>", "latency threshold that marks the knee", "150")
).action(
  async (
    opts: SharedOpts & {
      rooms: string;
      playersPerRoom: string;
      rates: string;
      stageSec: string;
      kneeP95Ms: string;
    }
  ) => {
    const { runThroughput } = await import("./scenarios/throughput.js");
    const params = {
      rooms: Number(opts.rooms),
      playersPerRoom: Number(opts.playersPerRoom),
      rates: opts.rates.split(",").map(Number),
      stageSec: Number(opts.stageSec),
      kneeP95Ms: Number(opts.kneeP95Ms)
    };
    await execute(
      "throughput",
      opts,
      { vus: params.rooms * params.playersPerRoom, durationSec: params.rates.length * (params.stageSec + 1) },
      () => params,
      (ctx) => runThroughput(ctx, params)
    );
  }
);

addSharedOptions(
  program
    .command("find-limits")
    .description("run all capacity ramps and print a CAPACITY REPORT with your actual maximums (~5-10 min)")
    .option("--max-players <n>", "cap for the players-in-one-room ramp", "500")
    .option("--max-rooms <n>", "cap for the concurrent-rooms ramp", "300")
    .option("--rates <list>", "mutation rates for the throughput ramp", "50,100,200,400,800,1600")
).action(async (opts: SharedOpts & { maxPlayers: string; maxRooms: string; rates: string }) => {
  const { runFindLimits } = await import("./scenarios/find-limits.js");
  // exploratory — maximums ARE the result, so no baseline gating
  opts.compare = false;
  opts.saveBaseline = false;
  const params = {
    maxPlayers: Number(opts.maxPlayers),
    maxRooms: Number(opts.maxRooms),
    rates: opts.rates.split(",").map(Number)
  };
  await execute(
    "find-limits",
    opts,
    { vus: Math.max(params.maxPlayers, params.maxRooms * 4), durationSec: 900 },
    (c) => ({
      maxPlayers: Math.min(params.maxPlayers, c.vus),
      maxRooms: Math.min(params.maxRooms, Math.max(1, Math.floor(c.vus / 4))),
      rates: params.rates
    }),
    (ctx, c) =>
      runFindLimits(ctx, {
        maxPlayers: Math.min(params.maxPlayers, c.vus),
        maxRooms: Math.min(params.maxRooms, Math.max(1, Math.floor(c.vus / 4))),
        rates: params.rates
      })
  );
});

program.parseAsync().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
