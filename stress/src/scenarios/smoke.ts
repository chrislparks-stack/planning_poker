import { Histogram, PropagationTracker } from "../metrics.js";
import type { MetricValue } from "../report.js";
import {
  chatNoncePredicate,
  createRoomWithVus,
  disposeAll,
  log,
  recordResult,
  revealPredicate,
  votePredicate,
  type ScenarioContext
} from "./support.js";

export interface SmokeResult {
  metrics: Record<string, MetricValue>;
  ok: boolean;
}

/**
 * Harness self-test: 5 VUs in one room; everyone votes, host reveals, resets,
 * everyone sends one chat message. Fails if any mutation errors or any VU
 * misses an expected event.
 */
export async function runSmoke(ctx: ScenarioContext, opts: { players: number }): Promise<SmokeResult> {
  const roomTracker = new PropagationTracker();
  const chatTracker = new PropagationTracker();
  const pickHist = new Histogram();
  const chatHist = new Histogram();
  let missedEvents = 0;

  const { roomId, vus, host } = await createRoomWithVus(ctx, opts.players, {
    namePrefix: "smoke",
    roomTrackers: [roomTracker],
    chatTrackers: [chatTracker]
  });
  console.log(`room ${roomId}: ${vus.length}/${opts.players} VUs connected and joined`);

  try {
    const receiverIds = vus.map((v) => v.userId);

    log(ctx, "voting...");
    for (const [i, vu] of vus.entries()) {
      const card = String([1, 2, 3, 5, 8][i % 5]);
      const expectation = roomTracker.expect({
        sentAt: Date.now(),
        predicate: votePredicate(vu.userId, card),
        receivers: receiverIds,
        deadlineMs: ctx.timeoutMs
      });
      recordResult(ctx, pickHist, await vu.pickCard(roomId, card));
      missedEvents += (await expectation).missed.length;
    }

    log(ctx, "revealing...");
    const revealExpectation = roomTracker.expect({
      sentAt: Date.now(),
      predicate: revealPredicate(),
      receivers: receiverIds,
      deadlineMs: ctx.timeoutMs
    });
    recordResult(ctx, new Histogram(), await host.showCards(roomId));
    missedEvents += (await revealExpectation).missed.length;

    log(ctx, "resetting...");
    recordResult(ctx, new Histogram(), await host.resetGame(roomId));

    log(ctx, "chatting...");
    for (const [i, vu] of vus.entries()) {
      const nonce = `smoke-${Date.now()}-${i}`;
      const expectation = chatTracker.expect({
        sentAt: Date.now(),
        predicate: chatNoncePredicate(nonce),
        receivers: receiverIds,
        deadlineMs: ctx.timeoutMs
      });
      recordResult(ctx, chatHist, await vu.sendChat(roomId, `hello ${nonce}`));
      missedEvents += (await expectation).missed.length;
    }
  } finally {
    roomTracker.drain();
    chatTracker.drain();
    await disposeAll(vus);
  }

  const ok = ctx.counters.errors === 0 && ctx.counters.timeouts === 0 && missedEvents === 0;
  console.log(
    ok
      ? "smoke OK: all mutations succeeded, every VU saw every expected event"
      : `smoke FAILED: errors=${ctx.counters.errors} timeouts=${ctx.counters.timeouts} missedEvents=${missedEvents}`
  );

  return {
    ok,
    metrics: {
      pickCard: pickHist.summary(),
      roomEventPropagation: roomTracker.histogram.summary(),
      chatPropagation: chatTracker.histogram.summary(),
      sendChat: chatHist.summary(),
      errors: ctx.counters.errors,
      timeouts: ctx.counters.timeouts,
      propagationTimeouts: roomTracker.timeouts + chatTracker.timeouts,
      wsDisconnects: ctx.counters.wsDisconnects,
      missedEvents
    }
  };
}
