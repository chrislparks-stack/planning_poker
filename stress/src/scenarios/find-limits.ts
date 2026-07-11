import type { ScenarioOutcome } from "../cli.js";
import type { HistSummary } from "../metrics.js";
import { makeCtx, type ScenarioContext } from "./support.js";

interface CurvePoint {
  [key: string]: number;
}

function atLimit(series: unknown, key: string): CurvePoint | undefined {
  const arr = series as CurvePoint[] | undefined;
  return arr?.length ? arr[arr.length - 1] : undefined;
}

/**
 * Runs all three capacity ramps and prints a single CAPACITY REPORT with the
 * actual maximums: players in one room, concurrent active rooms, and raw
 * mutation throughput. Exploratory — no baseline comparison, exits 0 unless
 * the harness itself fails. Numbers are for THIS machine and server build;
 * restart the server first for a clean memory picture.
 */
export async function runFindLimits(
  ctx: ScenarioContext,
  opts: { maxPlayers: number; maxRooms: number; rates: number[] }
): Promise<ScenarioOutcome> {
  const fresh = () => makeCtx(ctx.target, ctx.docs, ctx.timeoutMs, ctx.verbose);

  console.log("\n--- Phase 1/3: how many players fits in ONE room ---");
  const { runRoomCapacity } = await import("./room-capacity.js");
  const players = await runRoomCapacity(fresh(), {
    maxPlayers: opts.maxPlayers,
    step: 25,
    settleMs: 1000,
    joinP95Ms: 500,
    propP95Ms: 750
  });

  console.log("\n--- Phase 2/3: how many ACTIVE rooms at once ---");
  const { runRoomsCapacity } = await import("./rooms-capacity.js");
  const playersPerRoom = 4;
  const rooms = await runRoomsCapacity(fresh(), {
    maxRooms: opts.maxRooms,
    step: 25,
    playersPerRoom,
    mutP95Ms: 150,
    propP95Ms: 300,
    probeRooms: 5
  });

  console.log("\n--- Phase 3/3: how many server calls per second ---");
  const { runThroughput } = await import("./throughput.js");
  const throughput = await runThroughput(fresh(), {
    rooms: 10,
    playersPerRoom: 5,
    rates: opts.rates,
    stageSec: 8,
    kneeP95Ms: 150
  });

  const maxPlayers = players.metrics["maxSustainablePlayers"] as number;
  const maxRooms = rooms.metrics["maxConcurrentRooms"] as number;
  const maxRate = throughput.metrics["maxMutationsPerSec"] as number;
  const playersCapped = maxPlayers >= opts.maxPlayers;
  const roomsCapped = maxRooms >= opts.maxRooms;
  const throughputKnee = (throughput.series?.["knee"] ?? null) as {
    targetRate: number;
    p95: number;
  } | null;

  const playersAtLimit = atLimit(
    (players.series as Record<string, unknown>)["latencyByPlayerCount"],
    "players"
  );
  const roomsAtLimit = atLimit(
    (rooms.series as Record<string, unknown>)["latencyByRoomCount"],
    "rooms"
  );

  const line = "=".repeat(70);
  console.log(`\n${line}\n  CAPACITY REPORT  (${ctx.target.httpUrl})\n${line}`);
  console.log(
    `  Max players in ONE room:      ${maxPlayers}${playersCapped ? "+" : ""}` +
      (playersCapped
        ? "  (no degradation at the test cap — raise --max-players to push further)"
        : "  (degraded past thresholds beyond this)")
  );
  if (playersAtLimit) {
    console.log(
      `      at ${playersAtLimit["players"]} players: join p95 ${playersAtLimit["joinP95"]}ms, ` +
        `vote propagation p95 ${playersAtLimit["probePropagationP95"]}ms`
    );
  }
  console.log(
    `  Max concurrent ACTIVE rooms:  ${maxRooms}${roomsCapped ? "+" : ""} ` +
      `(${maxRooms * playersPerRoom} players total)` +
      (roomsCapped ? "  (no degradation at the test cap — raise --max-rooms)" : "")
  );
  if (roomsAtLimit) {
    console.log(
      `      at ${roomsAtLimit["rooms"]} rooms: mutation p95 ${roomsAtLimit["mutationP95"]}ms, ` +
        `propagation p95 ${roomsAtLimit["propagationP95"]}ms`
    );
  }
  console.log(
    `  Max server calls sustained:   ~${maxRate}/s` +
      (throughputKnee
        ? ` (knee at ${throughputKnee.targetRate}/s: p95 ${throughputKnee.p95}ms)`
        : " (no knee found — raise --rates)")
  );
  console.log(
    `${line}\n  Note: these are ceilings for THIS machine + server build, with the\n` +
      `  harness sharing the same CPU. Idle rooms cost only memory — the limits\n` +
      `  above are for rooms with live subscribers under active load.\n${line}`
  );

  const sumCounters = (name: string) =>
    ([players, rooms, throughput] as ScenarioOutcome[]).reduce(
      (n, o) => n + ((o.metrics[name] as number) ?? 0),
      0
    );

  return {
    ok: true,
    metrics: {
      maxPlayersInOneRoom: maxPlayers,
      maxConcurrentRooms: maxRooms,
      maxConcurrentPlayersAcrossRooms: maxRooms * playersPerRoom,
      maxMutationsPerSec: maxRate,
      join: players.metrics["join"] as HistSummary,
      pickCard: throughput.metrics["pickCard"] as HistSummary,
      errors: sumCounters("errors"),
      timeouts: sumCounters("timeouts"),
      wsDisconnects: sumCounters("wsDisconnects")
    },
    series: {
      playersCurve: (players.series as Record<string, unknown>)["latencyByPlayerCount"],
      roomsCurve: (rooms.series as Record<string, unknown>)["latencyByRoomCount"],
      throughputCurve: (throughput.series as Record<string, unknown>)["byRate"]
    }
  };
}
