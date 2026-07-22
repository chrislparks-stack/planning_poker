import { setTimeout as sleep } from "node:timers/promises";

import type { ScenarioOutcome } from "../cli.js";
import { Histogram, PropagationTracker } from "../metrics.js";
import {
  chatNoncePredicate,
  createRoomWithVus,
  disposeAll,
  makeCycleInstruments,
  recordResult,
  runVoteCycles,
  type CycleInstruments,
  type RoomSetup,
  type ScenarioContext
} from "./support.js";

/**
 * Sustained mixed load (slow vote cycles + low-rate chat) across a few rooms.
 * The interesting output is the server memory slope over the run — the
 * broker's unbounded per-subscriber channels are the suspected leak surface.
 */
export async function runSoak(
  ctx: ScenarioContext,
  opts: { players: number; rooms: number; durationSec: number }
): Promise<ScenarioOutcome> {
  const perRoom = Math.max(2, Math.floor(opts.players / opts.rooms));
  const voteHist = new Histogram();
  const revealHist = new Histogram();
  const resetHist = new Histogram();
  const sendHist = new Histogram();
  const chatTracker = new PropagationTracker();

  const rooms: Array<{ setup: RoomSetup; ins: CycleInstruments }> = [];
  for (let r = 0; r < opts.rooms; r++) {
    const ins = makeCycleInstruments({ voteHist, revealHist, resetHist });
    const setup = await createRoomWithVus(ctx, perRoom, {
      namePrefix: `soak${r}`,
      roomTrackers: [ins.voteProp, ins.revealProp, ins.resetProp],
      chatTrackers: [chatTracker]
    });
    rooms.push({ setup, ins });
  }
  const totalVus = rooms.reduce((n, r) => n + r.setup.vus.length, 0);
  console.log(`soaking ${totalVus} VUs across ${rooms.length} rooms for ${opts.durationSec}s...`);

  const endAt = Date.now() + opts.durationSec * 1000;
  let propagationTimeouts = 0;
  try {
    await Promise.all([
      // slow vote cycles per room until time is up
      ...rooms.map(({ setup, ins }) =>
        (async () => {
          while (Date.now() < endAt) {
            await runVoteCycles(ctx, setup, ins, { cycles: 1, staggerMs: 200, interCycleDelayMs: 2000 });
          }
        })()
      ),
      // low-rate chat round-robin across rooms
      (async () => {
        let seq = 0;
        while (Date.now() < endAt) {
          const { setup } = rooms[seq % rooms.length]!;
          const vu = setup.vus[seq % setup.vus.length]!;
          const nonce = `soak-${seq}`;
          seq++;
          const expectation = chatTracker.expect({
            sentAt: Date.now(),
            predicate: chatNoncePredicate(nonce),
            receivers: setup.vus.map((v) => v.userId),
            deadlineMs: ctx.timeoutMs
          });
          recordResult(ctx, sendHist, await vu.sendChat(setup.roomId, `soak chatter ${nonce}`));
          await expectation;
          await sleep(1000);
        }
      })()
    ]);
  } finally {
    chatTracker.drain();
    for (const { setup, ins } of rooms) {
      ins.voteProp.drain();
      ins.revealProp.drain();
      ins.resetProp.drain();
      propagationTimeouts += ins.voteProp.timeouts + ins.revealProp.timeouts + ins.resetProp.timeouts;
      await disposeAll(setup.vus);
    }
  }

  return {
    ok: ctx.counters.errors === 0,
    metrics: {
      rooms: rooms.length,
      totalPlayers: totalVus,
      votePropagation: voteHist.summary(),
      revealPropagation: revealHist.summary(),
      chatPropagation: chatTracker.histogram.summary(),
      sendChat: sendHist.summary(),
      errors: ctx.counters.errors,
      timeouts: ctx.counters.timeouts,
      propagationTimeouts: propagationTimeouts + chatTracker.timeouts,
      wsDisconnects: ctx.counters.wsDisconnects
    }
  };
}
