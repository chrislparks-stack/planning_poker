import { setTimeout as sleep } from "node:timers/promises";

import type { ScenarioOutcome } from "../cli.js";
import { Histogram, PropagationTracker } from "../metrics.js";
import {
  createRoomWithVus,
  disposeAll,
  recordResult,
  VOTE_CARDS,
  type RoomSetup,
  type ScenarioContext,
  type VuRoomPair
} from "./support.js";

export interface ThroughputStage {
  targetRate: number;
  achievedRate: number;
  p95: number;
  errors: number;
  timeouts: number;
}

/**
 * Ramps the raw mutation rate (pickCard across a pool of rooms, subscribers
 * attached so every call also fans out) until the server hits its knee:
 * latency blows past the threshold, the achieved rate falls behind the target,
 * or calls start failing. Answers "how many concurrent server calls can it
 * take before read/write impact".
 */
export async function runThroughput(
  ctx: ScenarioContext,
  opts: {
    rooms: number;
    playersPerRoom: number;
    rates: number[];
    stageSec: number;
    kneeP95Ms: number;
  }
): Promise<ScenarioOutcome> {
  // dummy tracker so VUs subscribe (realistic fan-out load) without tracking
  const sink = new PropagationTracker();
  const setups: RoomSetup[] = [];
  for (let r = 0; r < opts.rooms; r++) {
    setups.push(
      await createRoomWithVus(ctx, opts.playersPerRoom, {
        namePrefix: `thr${r}`,
        roomTrackers: [sink]
      })
    );
  }
  const senders: VuRoomPair[] = setups.flatMap((s) => s.vus.map((vu) => ({ vu, roomId: s.roomId })));
  console.log(
    `${senders.length} senders across ${setups.length} rooms; ramping ${opts.rates.join(", ")} mutations/s ` +
      `(${opts.stageSec}s per stage, knee at p95 > ${opts.kneeP95Ms}ms)`
  );

  const series: ThroughputStage[] = [];
  const allHist = new Histogram();
  let maxSustained = 0;
  let knee: ThroughputStage | null = null;

  try {
    for (const rate of opts.rates) {
      const stageHist = new Histogram();
      const errorsBefore = ctx.counters.errors;
      const timeoutsBefore = ctx.counters.timeouts;
      const inflight: Array<Promise<void>> = [];
      let sent = 0;
      let okCount = 0;
      let seq = 0;
      const start = Date.now();
      const stageEnd = start + opts.stageSec * 1000;

      while (Date.now() < stageEnd) {
        const due = Math.floor(((Date.now() - start) / 1000) * rate) - sent;
        for (let i = 0; i < due; i++) {
          const pair = senders[seq % senders.length]!;
          const card = VOTE_CARDS[seq % VOTE_CARDS.length]!;
          seq++;
          sent++;
          inflight.push(
            pair.vu.pickCard(pair.roomId, card).then((res) => {
              recordResult(ctx, stageHist, res);
              if (res.ok) {
                okCount++;
                allHist.record(res.latencyMs);
              }
            })
          );
        }
        await sleep(5);
      }
      await Promise.allSettled(inflight);

      const elapsedSec = (Date.now() - start) / 1000;
      const stage: ThroughputStage = {
        targetRate: rate,
        achievedRate: Math.round((okCount / elapsedSec) * 10) / 10,
        p95: stageHist.summary().p95,
        errors: ctx.counters.errors - errorsBefore,
        timeouts: ctx.counters.timeouts - timeoutsBefore
      };
      series.push(stage);
      console.log(
        `rate ${rate}/s: achieved ${stage.achievedRate}/s, p95 ${stage.p95}ms, ` +
          `errors ${stage.errors}, timeouts ${stage.timeouts}`
      );

      const atKnee =
        stage.errors > 0 ||
        stage.timeouts > 0 ||
        stage.p95 > opts.kneeP95Ms ||
        stage.achievedRate < rate * 0.9;
      if (atKnee) {
        knee = stage;
        break;
      }
      maxSustained = stage.achievedRate;
      await sleep(1000);
    }
  } finally {
    sink.drain();
    await Promise.allSettled(setups.map((s) => disposeAll(s.vus)));
  }

  console.log(
    `\nmax sustained mutation rate: ~${maxSustained}/s` +
      (knee
        ? ` (knee at ${knee.targetRate}/s: p95 ${knee.p95}ms, achieved ${knee.achievedRate}/s)`
        : " (no knee found — raise --rates to push further)")
  );
  console.table(series);
  return {
    ok: true,
    metrics: {
      maxMutationsPerSec: maxSustained,
      pickCard: allHist.summary(),
      errors: ctx.counters.errors,
      timeouts: ctx.counters.timeouts,
      wsDisconnects: ctx.counters.wsDisconnects
    },
    series: { byRate: series, knee }
  };
}
