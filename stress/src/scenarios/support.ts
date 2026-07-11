import { setTimeout as sleep } from "node:timers/promises";

import type { Target } from "../config.js";
import type { ChatPayload, Docs, RoomSnapshot } from "../gql.js";
import { Counters, Histogram, PropagationTracker } from "../metrics.js";
import { VirtualUser } from "../vu.js";

export interface ScenarioContext {
  target: Target;
  docs: Docs;
  timeoutMs: number;
  verbose: boolean;
  counters: Counters;
}

export function log(ctx: ScenarioContext, msg: string): void {
  if (ctx.verbose) console.log(msg);
}

export function recordResult(
  ctx: ScenarioContext,
  hist: Histogram,
  res: { ok: boolean; latencyMs: number; error?: string }
): void {
  if (res.ok) {
    hist.record(res.latencyMs);
  } else if (res.error === "timeout") {
    ctx.counters.timeouts++;
  } else {
    ctx.counters.errors++;
    if (ctx.verbose) console.error(`  mutation error: ${res.error}`);
  }
}

/** Connect + createUser for N VUs, in batches so we don't stampede the socket accept queue. */
export async function createVus(ctx: ScenarioContext, count: number, namePrefix: string): Promise<VirtualUser[]> {
  const vus: VirtualUser[] = [];
  const batchSize = 25;
  for (let i = 0; i < count; i += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, count - i) }, (_, j) => {
      const vu = new VirtualUser(ctx.target, ctx.docs, {
        timeoutMs: ctx.timeoutMs,
        onDisconnect: () => ctx.counters.wsDisconnects++
      });
      return (async () => {
        await vu.connect();
        const res = await vu.createUser(`${namePrefix}-${i + j}`);
        if (!res.ok) throw new Error(`createUser failed: ${res.error}`);
        return vu;
      })();
    });
    vus.push(...(await Promise.all(batch)));
  }
  return vus;
}

export interface RoomSetup {
  roomId: string;
  vus: VirtualUser[];
  host: VirtualUser;
  joinHist: Histogram;
}

/**
 * First VU creates the room; all VUs join (batched) and open the room + chat
 * subscriptions, feeding payloads into the given trackers.
 */
export async function createRoomWithVus(
  ctx: ScenarioContext,
  players: number,
  opts: {
    namePrefix: string;
    roomTrackers?: PropagationTracker[];
    chatTrackers?: PropagationTracker[];
    existingRoomId?: string;
  }
): Promise<RoomSetup> {
  const vus = await createVus(ctx, players, opts.namePrefix);
  const host = vus[0];
  if (!host) throw new Error("no VUs created");

  let roomId = opts.existingRoomId;
  if (!roomId) {
    const created = await host.createRoom(`${opts.namePrefix}-room`);
    if (!created.ok || !created.roomId) throw new Error(`createRoom failed: ${created.error}`);
    roomId = created.roomId;
  }

  const joinHist = new Histogram();
  const batchSize = 10;
  for (let i = 0; i < vus.length; i += batchSize) {
    await Promise.all(
      vus.slice(i, i + batchSize).map(async (vu) => {
        subscribeVu(vu, roomId, opts);
        const res = await vu.joinRoom(roomId);
        recordResult(ctx, joinHist, res);
      })
    );
  }
  await sleep(300);
  return { roomId, vus, host, joinHist };
}

export function subscribeVu(
  vu: VirtualUser,
  roomId: string,
  trackers: { roomTrackers?: PropagationTracker[]; chatTrackers?: PropagationTracker[] }
): void {
  const room = trackers.roomTrackers;
  if (room?.length) {
    vu.subscribeRoom(roomId, (payload, t) => {
      for (const tracker of room) tracker.onEvent(vu.userId, payload, t);
    });
  }
  const chat = trackers.chatTrackers;
  if (chat?.length) {
    vu.subscribeChat(roomId, (payload, t) => {
      for (const tracker of chat) tracker.onEvent(vu.userId, payload, t);
    });
  }
}

export async function disposeAll(vus: VirtualUser[]): Promise<void> {
  await Promise.allSettled(vus.map((vu) => vu.dispose()));
}

// === Propagation predicates (payloads from the room/chat subscriptions) ===

export function votePredicate(voterId: string, card: string): (payload: unknown) => boolean {
  return (payload) => {
    const room = payload as RoomSnapshot;
    return Array.isArray(room.users) && room.users.some((u) => u.id === voterId && u.lastCardPicked === card);
  };
}

export function revealPredicate(): (payload: unknown) => boolean {
  return (payload) => (payload as RoomSnapshot).isGameOver;
}

export function resetPredicate(): (payload: unknown) => boolean {
  return (payload) => {
    const room = payload as RoomSnapshot;
    return !room.isGameOver && Array.isArray(room.users) && room.users.every((u) => u.lastCardPicked === null);
  };
}

export function chatNoncePredicate(nonce: string): (payload: unknown) => boolean {
  return (payload) => typeof (payload as ChatPayload).content === "string" && (payload as ChatPayload).content.includes(nonce);
}

export function makeCtx(target: Target, docs: Docs, timeoutMs: number, verbose: boolean): ScenarioContext {
  return { target, docs, timeoutMs, verbose, counters: new Counters() };
}

// === Shared vote-cycle engine (vote-cycle, multi-room, soak) ===

export interface CycleInstruments {
  pickCard: Histogram;
  showCards: Histogram;
  /** Wire these as roomTrackers when creating the room */
  voteProp: PropagationTracker;
  revealProp: PropagationTracker;
  resetProp: PropagationTracker;
  /** Per-cycle time until the LAST subscriber saw the reveal */
  revealFullyPropagated: Histogram;
  cycleWallTime: Histogram;
}

export function makeCycleInstruments(shared?: {
  voteHist?: Histogram;
  revealHist?: Histogram;
  resetHist?: Histogram;
}): CycleInstruments {
  return {
    pickCard: new Histogram(),
    showCards: new Histogram(),
    voteProp: new PropagationTracker(shared?.voteHist),
    revealProp: new PropagationTracker(shared?.revealHist),
    resetProp: new PropagationTracker(shared?.resetHist),
    revealFullyPropagated: new Histogram(),
    cycleWallTime: new Histogram()
  };
}

const VOTE_CARDS = ["1", "2", "3", "5", "8", "13", "21"];

/**
 * players vote (staggered) → host reveals → host resets, `cycles` times,
 * measuring mutation latency and per-receiver propagation for each phase.
 */
export async function runVoteCycles(
  ctx: ScenarioContext,
  setup: RoomSetup,
  ins: CycleInstruments,
  opts: { cycles: number; staggerMs?: number; interCycleDelayMs?: number }
): Promise<void> {
  const { roomId, vus, host } = setup;
  const receivers = vus.map((v) => v.userId);
  const stagger = opts.staggerMs ?? 50;

  for (let cycle = 0; cycle < opts.cycles; cycle++) {
    const cycleStart = performance.now();

    const votePromises: Array<Promise<unknown>> = [];
    for (const [i, vu] of vus.entries()) {
      const card = VOTE_CARDS[i % VOTE_CARDS.length]!;
      const expectation = ins.voteProp.expect({
        sentAt: Date.now(),
        predicate: votePredicate(vu.userId, card),
        receivers,
        deadlineMs: ctx.timeoutMs
      });
      votePromises.push(vu.pickCard(roomId, card).then((res) => recordResult(ctx, ins.pickCard, res)));
      votePromises.push(expectation);
      if (stagger > 0) await sleep(stagger);
    }
    await Promise.all(votePromises);

    const revealExpectation = ins.revealProp.expect({
      sentAt: Date.now(),
      predicate: revealPredicate(),
      receivers,
      deadlineMs: ctx.timeoutMs
    });
    recordResult(ctx, ins.showCards, await host.showCards(roomId));
    const revealResult = await revealExpectation;
    if (revealResult.latencies.length > 0) {
      ins.revealFullyPropagated.record(Math.max(...revealResult.latencies));
    }

    const resetExpectation = ins.resetProp.expect({
      sentAt: Date.now(),
      predicate: resetPredicate(),
      receivers,
      deadlineMs: ctx.timeoutMs
    });
    recordResult(ctx, new Histogram(), await host.resetGame(roomId));
    await resetExpectation;

    ins.cycleWallTime.record(performance.now() - cycleStart);
    log(ctx, `  cycle ${cycle + 1}/${opts.cycles} done`);
    if (opts.interCycleDelayMs) await sleep(opts.interCycleDelayMs);
  }
}
