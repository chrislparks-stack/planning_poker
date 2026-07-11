import { setTimeout as sleep } from "node:timers/promises";

import { createRoomWithVus, type ScenarioContext } from "./support.js";

const VOTE_CARDS = ["1", "2", "3", "5", "8", "13", "21"];

/**
 * Joins N VUs into an EXISTING room and holds them there, voting and chatting
 * at a low rate, until the process is killed. Background load for the
 * Playwright browser stress spec, which spawns this as a child process and
 * waits for the SEED_READY line.
 */
export async function runSeed(
  ctx: ScenarioContext,
  opts: { roomId: string; players: number; chatRatePerSec: number; voteIntervalMs: number }
): Promise<void> {
  const { roomId, vus } = await createRoomWithVus(ctx, opts.players, {
    namePrefix: "seed",
    existingRoomId: opts.roomId
  });
  // Parsed by client/tests/stress-browser.spec.ts — keep the format stable.
  console.log(`SEED_READY room=${roomId} players=${vus.length}`);

  let running = true;
  process.on("SIGINT", () => {
    running = false;
  });
  process.on("SIGTERM", () => {
    running = false;
  });

  let seq = 0;
  const chatIntervalMs = opts.chatRatePerSec > 0 ? 1000 / opts.chatRatePerSec : Infinity;
  let nextChat = Date.now() + chatIntervalMs;
  let nextVote = Date.now() + opts.voteIntervalMs;

  while (running) {
    const now = Date.now();
    if (now >= nextChat) {
      nextChat = now + chatIntervalMs;
      const vu = vus[seq++ % vus.length]!;
      void vu.sendChat(roomId, `seed chatter ${seq}`).then((res) => {
        if (!res.ok) ctx.counters.errors++;
      });
    }
    if (now >= nextVote) {
      nextVote = now + opts.voteIntervalMs;
      const vu = vus[Math.floor(Math.random() * vus.length)]!;
      const card = VOTE_CARDS[Math.floor(Math.random() * VOTE_CARDS.length)]!;
      void vu.pickCard(roomId, card).then((res) => {
        if (!res.ok) ctx.counters.errors++;
      });
    }
    await sleep(50);
  }

  await Promise.allSettled(vus.map((vu) => vu.dispose()));
  process.exit(0);
}
