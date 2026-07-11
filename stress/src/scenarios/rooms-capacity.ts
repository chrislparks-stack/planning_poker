import { setTimeout as sleep } from "node:timers/promises";

import type { ScenarioOutcome } from "../cli.js";
import { Histogram, PropagationTracker } from "../metrics.js";
import {
  createRoomWithVus,
  disposeAll,
  recordResult,
  votePredicate,
  VOTE_CARDS,
  type RoomSetup,
  type ScenarioContext
} from "./support.js";

export interface RoomsStepResult {
  rooms: number;
  players: number;
  mutationP95: number;
  propagationP95: number;
  missed: number;
}

/**
 * Ramps the number of concurrently ACTIVE rooms (each with a few subscribed
 * players) until mutation latency or in-room propagation degrades. This is
 * the scaling axis the architecture is most sensitive to: every mutation
 * takes the global storage mutex, and the broker clones each publish to all
 * subscribers of that type across ALL rooms before per-room filtering.
 */
export async function runRoomsCapacity(
  ctx: ScenarioContext,
  opts: {
    maxRooms: number;
    step: number;
    playersPerRoom: number;
    mutP95Ms: number;
    propP95Ms: number;
    probeRooms: number;
  }
): Promise<ScenarioOutcome> {
  const roomSetups: Array<{ setup: RoomSetup; tracker: PropagationTracker }> = [];
  const series: RoomsStepResult[] = [];
  const mutationHist = new Histogram();
  const propagationHist = new Histogram();

  let strikes = 0;
  let maxSustainable = 0;
  let stopReason = "reached --max-rooms";
  let probeSeq = 0;

  try {
    while (roomSetups.length < opts.maxRooms) {
      const batch = Math.min(opts.step, opts.maxRooms - roomSetups.length);
      for (let i = 0; i < batch; i += 5) {
        const chunk = await Promise.all(
          Array.from({ length: Math.min(5, batch - i) }, async (_, j) => {
            const tracker = new PropagationTracker();
            const setup = await createRoomWithVus(ctx, opts.playersPerRoom, {
              namePrefix: `rc${roomSetups.length + i + j}`,
              roomTrackers: [tracker]
            });
            return { setup, tracker };
          })
        );
        roomSetups.push(...chunk);
      }
      await sleep(500);

      // Probe: vote in a few random rooms; measure mutation latency and how
      // long the snapshot takes to reach that room's subscribers.
      const stepMutation = new Histogram();
      const stepPropagation = new Histogram();
      let missed = 0;
      const probes = Math.min(opts.probeRooms, roomSetups.length);
      for (let p = 0; p < probes; p++) {
        const { setup, tracker } = roomSetups[Math.floor(Math.random() * roomSetups.length)]!;
        const voter = setup.vus[probeSeq % setup.vus.length]!;
        const card = VOTE_CARDS[probeSeq % VOTE_CARDS.length]!;
        probeSeq++;

        const expectation = tracker.expect({
          sentAt: Date.now(),
          predicate: votePredicate(voter.userId, card),
          receivers: setup.vus.map((v) => v.userId),
          deadlineMs: ctx.timeoutMs
        });
        const res = await voter.pickCard(setup.roomId, card);
        recordResult(ctx, stepMutation, res);
        if (res.ok) mutationHist.record(res.latencyMs);
        const prop = await expectation;
        for (const l of prop.latencies) {
          stepPropagation.record(l);
          propagationHist.record(l);
        }
        missed += prop.missed.length;
      }

      const step: RoomsStepResult = {
        rooms: roomSetups.length,
        players: roomSetups.length * opts.playersPerRoom,
        mutationP95: stepMutation.summary().p95,
        propagationP95: stepPropagation.summary().p95,
        missed
      };
      series.push(step);
      console.log(
        `${step.rooms} rooms (${step.players} players): mutation p95 ${step.mutationP95}ms, ` +
          `propagation p95 ${step.propagationP95}ms` +
          (missed ? `, ${missed} receivers missed the deadline` : "")
      );

      const degraded =
        step.mutationP95 > opts.mutP95Ms ||
        step.propagationP95 > opts.propP95Ms ||
        missed > 0 ||
        ctx.counters.errors > 0;

      if (degraded) {
        strikes++;
        if (missed > 0 || ctx.counters.errors > 0) {
          stopReason = `errors/missed events at ${step.rooms} rooms`;
          break;
        }
        if (strikes >= 2) {
          stopReason = `latency thresholds exceeded twice consecutively at ${step.rooms} rooms`;
          break;
        }
      } else {
        strikes = 0;
        maxSustainable = step.rooms;
      }
    }
    if (roomSetups.length >= opts.maxRooms && strikes === 0) {
      maxSustainable = roomSetups.length;
    }
  } finally {
    console.log("disposing VUs...");
    for (const { tracker } of roomSetups) tracker.drain();
    await Promise.allSettled(roomSetups.map(({ setup }) => disposeAll(setup.vus)));
  }

  console.log(`\nmax concurrent active rooms: ${maxSustainable} (${stopReason})`);
  console.table(series);
  return {
    ok: true,
    metrics: {
      maxConcurrentRooms: maxSustainable,
      playersPerRoom: opts.playersPerRoom,
      mutation: mutationHist.summary(),
      propagation: propagationHist.summary(),
      errors: ctx.counters.errors,
      timeouts: ctx.counters.timeouts,
      wsDisconnects: ctx.counters.wsDisconnects
    },
    series: { latencyByRoomCount: series, stopReason }
  };
}
