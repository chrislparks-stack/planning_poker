import { setTimeout as sleep } from "node:timers/promises";

import type { ScenarioOutcome } from "../cli.js";
import { Histogram, PropagationTracker } from "../metrics.js";
import {
  chatNoncePredicate,
  createRoomWithVus,
  disposeAll,
  recordResult,
  type ScenarioContext
} from "./support.js";

interface RateResult {
  rate: number;
  achievedRate: number;
  sendP95: number;
  propagationP95: number;
  propagationTimeouts: number;
}

/**
 * Round-robin senders push chat messages at a target rate; measures send
 * latency and nonce-correlated propagation to every subscriber. --ramp sweeps
 * several rates in one run.
 */
export async function runChatStorm(
  ctx: ScenarioContext,
  opts: { players: number; rates: number[]; durationSec: number }
): Promise<ScenarioOutcome> {
  const sendHist = new Histogram();
  const propTracker = new PropagationTracker();

  const setup = await createRoomWithVus(ctx, opts.players, {
    namePrefix: "chat",
    chatTrackers: [propTracker]
  });
  const { roomId, vus } = setup;
  const receivers = vus.map((v) => v.userId);
  console.log(`room ${roomId}: ${vus.length} players joined`);

  const series: RateResult[] = [];
  const runId = Date.now().toString(36);

  try {
    for (const rate of opts.rates) {
      const stageSend = new Histogram();
      const stageProp = new Histogram();
      const timeoutsBefore = propTracker.timeouts;
      const intervalMs = 1000 / rate;
      const stageEnd = Date.now() + opts.durationSec * 1000;
      const inflight: Array<Promise<unknown>> = [];
      let sent = 0;
      let seq = 0;
      const stageStart = Date.now();

      console.log(`rate ${rate} msg/s for ${opts.durationSec}s...`);
      while (Date.now() < stageEnd) {
        const vu = vus[seq % vus.length]!;
        const nonce = `storm-${runId}-${rate}-${seq}`;
        seq++;
        const expectation = propTracker.expect({
          sentAt: Date.now(),
          predicate: chatNoncePredicate(nonce),
          receivers,
          deadlineMs: ctx.timeoutMs
        });
        inflight.push(
          vu.sendChat(roomId, `stress ${nonce}`).then((res) => {
            recordResult(ctx, sendHist, res);
            if (res.ok) {
              stageSend.record(res.latencyMs);
              sent++;
            }
          }),
          expectation.then((r) => {
            for (const l of r.latencies) stageProp.record(l);
          })
        );
        await sleep(intervalMs);
      }
      await Promise.all(inflight);

      const elapsedSec = (Date.now() - stageStart) / 1000;
      const stage: RateResult = {
        rate,
        achievedRate: Math.round((sent / elapsedSec) * 10) / 10,
        sendP95: stageSend.summary().p95,
        propagationP95: stageProp.summary().p95,
        propagationTimeouts: propTracker.timeouts - timeoutsBefore
      };
      series.push(stage);
      console.log(
        `  achieved ${stage.achievedRate}/s, send p95 ${stage.sendP95}ms, propagation p95 ${stage.propagationP95}ms, ` +
          `${stage.propagationTimeouts} propagation timeouts`
      );
    }
  } finally {
    propTracker.drain();
    await disposeAll(vus);
  }

  return {
    ok: ctx.counters.errors === 0,
    metrics: {
      join: setup.joinHist.summary(),
      sendChat: sendHist.summary(),
      chatPropagation: propTracker.histogram.summary(),
      errors: ctx.counters.errors,
      timeouts: ctx.counters.timeouts,
      propagationTimeouts: propTracker.timeouts,
      wsDisconnects: ctx.counters.wsDisconnects
    },
    series: { byRate: series }
  };
}
