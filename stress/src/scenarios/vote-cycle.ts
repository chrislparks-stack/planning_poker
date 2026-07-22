import type { ScenarioOutcome } from "../cli.js";
import {
  createRoomWithVus,
  disposeAll,
  makeCycleInstruments,
  runVoteCycles,
  type ScenarioContext
} from "./support.js";

/**
 * N players in one room run vote → reveal → reset cycles. Measures pickCard
 * latency and how long votes/reveals take to reach every subscriber.
 */
export async function runVoteCycleScenario(
  ctx: ScenarioContext,
  opts: { players: number; cycles: number }
): Promise<ScenarioOutcome> {
  const ins = makeCycleInstruments();
  const setup = await createRoomWithVus(ctx, opts.players, {
    namePrefix: "vote",
    roomTrackers: [ins.voteProp, ins.revealProp, ins.resetProp]
  });
  console.log(`room ${setup.roomId}: ${setup.vus.length} players joined, running ${opts.cycles} cycles`);

  try {
    await runVoteCycles(ctx, setup, ins, { cycles: opts.cycles });
  } finally {
    ins.voteProp.drain();
    ins.revealProp.drain();
    ins.resetProp.drain();
    await disposeAll(setup.vus);
  }

  const propagationTimeouts = ins.voteProp.timeouts + ins.revealProp.timeouts + ins.resetProp.timeouts;
  return {
    ok: ctx.counters.errors === 0,
    metrics: {
      join: setup.joinHist.summary(),
      pickCard: ins.pickCard.summary(),
      showCards: ins.showCards.summary(),
      votePropagation: ins.voteProp.histogram.summary(),
      revealPropagation: ins.revealProp.histogram.summary(),
      revealFullyPropagated: ins.revealFullyPropagated.summary(),
      resetPropagation: ins.resetProp.histogram.summary(),
      cycleWallTime: ins.cycleWallTime.summary(),
      errors: ctx.counters.errors,
      timeouts: ctx.counters.timeouts,
      propagationTimeouts,
      wsDisconnects: ctx.counters.wsDisconnects
    }
  };
}
