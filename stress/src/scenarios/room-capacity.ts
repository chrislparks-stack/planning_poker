import { setTimeout as sleep } from "node:timers/promises";

import type { ScenarioOutcome } from "../cli.js";
import { Histogram, PropagationTracker } from "../metrics.js";
import { VirtualUser } from "../vu.js";
import { createVus, recordResult, subscribeVu, votePredicate, type ScenarioContext } from "./support.js";

interface StepResult {
  players: number;
  joinP95: number;
  probePropagationP95: number;
  probePropagationMax: number;
  missedReceivers: number;
}

const PROBE_CARDS = ["1", "2", "3", "5", "8", "13", "21", "34", "55", "89"];

/**
 * Ramps players into one room in steps until join latency or vote-propagation
 * latency degrades past thresholds (two consecutive strikes), errors appear,
 * or --max-players is reached. Every join broadcasts a full room snapshot to
 * all existing subscribers, so join cost is inherently O(N) — this finds
 * where that stops being acceptable.
 */
export async function runRoomCapacity(
  ctx: ScenarioContext,
  opts: {
    maxPlayers: number;
    step: number;
    settleMs: number;
    joinP95Ms: number;
    propP95Ms: number;
  }
): Promise<ScenarioOutcome> {
  const joinHist = new Histogram();
  const probeTracker = new PropagationTracker();
  const allVus: VirtualUser[] = [];
  const series: StepResult[] = [];

  let roomId = "";
  let strikes = 0;
  let maxSustainable = 0;
  let stopReason = "reached --max-players";

  try {
    while (allVus.length < opts.maxPlayers) {
      const batchSize = Math.min(opts.step, opts.maxPlayers - allVus.length);
      const batch = await createVus(ctx, batchSize, `cap-${allVus.length}`);
      allVus.push(...batch);

      if (!roomId) {
        const created = await batch[0]!.createRoom("capacity-room");
        if (!created.ok || !created.roomId) throw new Error(`createRoom failed: ${created.error}`);
        roomId = created.roomId;
      }

      const stepJoin = new Histogram();
      for (const vu of batch) {
        subscribeVu(vu, roomId, { roomTrackers: [probeTracker] });
        const res = await vu.joinRoom(roomId);
        recordResult(ctx, stepJoin, res);
        if (res.ok) joinHist.record(res.latencyMs);
      }
      await sleep(opts.settleMs);

      // Probe: the first VU re-votes with a fresh card; measure how long the
      // snapshot takes to reach every current subscriber.
      const prober = allVus[0]!;
      const card = PROBE_CARDS[series.length % PROBE_CARDS.length]!;
      const receivers = allVus.map((v) => v.userId);
      const expectation = probeTracker.expect({
        sentAt: Date.now(),
        predicate: votePredicate(prober.userId, card),
        receivers,
        deadlineMs: ctx.timeoutMs
      });
      recordResult(ctx, new Histogram(), await prober.pickCard(roomId, card));
      const probe = await expectation;

      const probeHist = new Histogram();
      for (const l of probe.latencies) probeHist.record(l);
      const probeSummary = probeHist.summary();
      const step: StepResult = {
        players: allVus.length,
        joinP95: stepJoin.summary().p95,
        probePropagationP95: probeSummary.p95,
        probePropagationMax: probeSummary.max,
        missedReceivers: probe.missed.length
      };
      series.push(step);
      console.log(
        `${step.players} players: join p95 ${step.joinP95}ms, probe propagation p95 ${step.probePropagationP95}ms` +
          (step.missedReceivers ? `, ${step.missedReceivers} receivers missed the deadline` : "")
      );

      const degraded =
        step.joinP95 > opts.joinP95Ms ||
        step.probePropagationP95 > opts.propP95Ms ||
        step.missedReceivers > 0 ||
        ctx.counters.errors > 0;

      if (degraded) {
        strikes++;
        if (step.missedReceivers > 0 || ctx.counters.errors > 0) {
          stopReason = `errors/missed events at ${step.players} players`;
          break;
        }
        if (strikes >= 2) {
          stopReason = `latency thresholds exceeded twice consecutively at ${step.players} players`;
          break;
        }
      } else {
        strikes = 0;
        maxSustainable = step.players;
      }
    }
    if (allVus.length >= opts.maxPlayers && strikes === 0) {
      maxSustainable = allVus.length;
    }
  } finally {
    probeTracker.drain();
    console.log("disposing VUs...");
    await Promise.allSettled(allVus.map((vu) => vu.dispose()));
  }

  console.log(`\nmax sustainable players: ${maxSustainable} (${stopReason})`);
  console.table(series);
  return {
    // Finding the ceiling is the point — hitting it isn't a failure.
    ok: true,
    metrics: {
      maxSustainablePlayers: maxSustainable,
      join: joinHist.summary(),
      probePropagation: probeTracker.histogram.summary(),
      errors: ctx.counters.errors,
      timeouts: ctx.counters.timeouts,
      propagationTimeouts: probeTracker.timeouts,
      wsDisconnects: ctx.counters.wsDisconnects
    },
    series: { latencyByPlayerCount: series, stopReason }
  };
}
