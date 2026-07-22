import type { ScenarioOutcome } from "../cli.js";
import { Histogram } from "../metrics.js";
import {
  createRoomWithVus,
  disposeAll,
  makeCycleInstruments,
  runVoteCycles,
  type CycleInstruments,
  type RoomSetup,
  type ScenarioContext
} from "./support.js";

/**
 * Many rooms with a few players each run vote cycles concurrently. The broker
 * clones every publish to ALL subscribers of a type across ALL rooms before
 * per-room filtering, and all mutations share one global mutex — so compare
 * these numbers with a single-room vote-cycle run at the same total VU count
 * to see the fan-out/contention cost.
 */
export async function runMultiRoom(
  ctx: ScenarioContext,
  opts: { rooms: number; playersPerRoom: number; cycles: number }
): Promise<ScenarioOutcome> {
  const voteHist = new Histogram();
  const revealHist = new Histogram();
  const resetHist = new Histogram();
  const joinAll = new Histogram();
  const pickAll = new Histogram();
  const cycleAll = new Histogram();

  const rooms: Array<{ setup: RoomSetup; ins: CycleInstruments }> = [];
  console.log(`setting up ${opts.rooms} rooms × ${opts.playersPerRoom} players...`);
  for (let r = 0; r < opts.rooms; r++) {
    const ins = makeCycleInstruments({ voteHist, revealHist, resetHist });
    const setup = await createRoomWithVus(ctx, opts.playersPerRoom, {
      namePrefix: `mr${r}`,
      roomTrackers: [ins.voteProp, ins.revealProp, ins.resetProp]
    });
    rooms.push({ setup, ins });
  }
  const totalVus = rooms.reduce((n, r) => n + r.setup.vus.length, 0);
  console.log(`${totalVus} VUs across ${rooms.length} rooms; running ${opts.cycles} concurrent cycles per room`);

  let propagationTimeouts = 0;
  try {
    await Promise.all(
      rooms.map(({ setup, ins }, r) =>
        (async () => {
          // desynchronize rooms slightly so cycles overlap realistically
          await new Promise((res) => setTimeout(res, (r % 10) * 100));
          await runVoteCycles(ctx, setup, ins, {
            cycles: opts.cycles,
            staggerMs: 100,
            interCycleDelayMs: 500
          });
        })()
      )
    );
  } finally {
    for (const { setup, ins } of rooms) {
      ins.voteProp.drain();
      ins.revealProp.drain();
      ins.resetProp.drain();
      propagationTimeouts += ins.voteProp.timeouts + ins.revealProp.timeouts + ins.resetProp.timeouts;
      await disposeAll(setup.vus);
    }
  }

  for (const { setup, ins } of rooms) {
    mergeInto(joinAll, setup.joinHist);
    mergeInto(pickAll, ins.pickCard);
    mergeInto(cycleAll, ins.cycleWallTime);
  }

  return {
    ok: ctx.counters.errors === 0,
    metrics: {
      rooms: rooms.length,
      totalPlayers: totalVus,
      join: joinAll.summary(),
      pickCard: pickAll.summary(),
      votePropagation: voteHist.summary(),
      revealPropagation: revealHist.summary(),
      resetPropagation: resetHist.summary(),
      cycleWallTime: cycleAll.summary(),
      errors: ctx.counters.errors,
      timeouts: ctx.counters.timeouts,
      propagationTimeouts,
      wsDisconnects: ctx.counters.wsDisconnects
    }
  };
}

function mergeInto(target: Histogram, source: Histogram): void {
  for (const v of source.valuesRef()) target.record(v);
}
