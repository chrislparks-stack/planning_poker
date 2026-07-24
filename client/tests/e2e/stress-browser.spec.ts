// Playwright end-to-end stress coverage.
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type Page } from "@playwright/test";

import { createRoom, joinRoom, startNewRound } from "./helpers";

const BACKEND = "http://localhost:8000";
const APP = "http://localhost:5173";
const SEED_PLAYERS = 40;
const REAL_GUESTS = 3;
/** Soft threshold: cross-tab click-to-render under load */
const RENDER_BUDGET_MS = 2000;

const STRESS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "stress"
);

/**
 * Client-side rendering degradation check: seeds a room with protocol-level
 * virtual users (stress/ harness `seed` subcommand), then measures cross-tab
 * click-to-render timings in a few real browser tabs.
 *
 * Requires the backend (8000) and Vite dev server (5173) to be running:
 *   cd server && HEARTBEAT_INTERVAL_SECS=1 RUST_LOG=warn cargo run --release
 *   cd client && npm run dev
 *   cd stress && npm install   (once)
 */
test.describe("@stress room under heavy load", () => {
  let seeder: ChildProcess | undefined;
  const pages: Page[] = [];

  test.beforeAll(async () => {
    const reachable = await Promise.all(
      [`${BACKEND}/health_check`, APP].map(async (url) => {
        try {
          return (await fetch(url, { signal: AbortSignal.timeout(3000) })).ok;
        } catch {
          return false;
        }
      })
    );
    test.skip(
      !reachable.every(Boolean),
      `requires the backend at ${BACKEND} and the Vite dev server at ${APP} — see comment at the top of this spec`
    );
  });

  test.afterAll(async () => {
    killSeeder(seeder);
    await Promise.all(pages.map((page) => page.close()));
  });

  test("interactions stay responsive with 40+ users in the room", async ({
    browser
  }, testInfo) => {
    test.setTimeout(180_000);
    const timings: Record<string, number> = {};

    const host = await browser.newPage();
    pages.push(host);
    const roomUrl = await createRoom(host);
    await joinRoom(host, "Host");
    const roomId = new URL(roomUrl).pathname.split("/").filter(Boolean).pop()!;

    seeder = spawnSeeder(roomId);
    await waitForSeedReady(seeder);

    const guests: Page[] = [];
    for (let i = 0; i < REAL_GUESTS; i++) {
      const guest = await browser.newPage();
      pages.push(guest);
      guests.push(guest);
      await joinRoom(guest, `RealGuest ${i + 1}`, roomUrl);
    }
    const observer = guests[REAL_GUESTS - 1];

    // Everyone rendered: seeded VUs + host + real guests, in every real tab.
    let t0 = performance.now();
    const totalPlayers = SEED_PLAYERS + 1 + REAL_GUESTS;
    await expect(host.getByTestId("player")).toHaveCount(totalPlayers, {
      timeout: 30_000
    });
    await expect(observer.getByTestId("player")).toHaveCount(totalPlayers, {
      timeout: 30_000
    });
    timings.fullRosterRenderMs = Math.round(performance.now() - t0);

    // Vote propagation: guest 1 picks a card; observer tab shows their
    // "Card picked" indicator.
    const voterTile = observer
      .getByTestId("player")
      .filter({ hasText: "RealGuest 1" });
    t0 = performance.now();
    await guests[0].getByRole("button", { name: "5", exact: true }).click();
    await expect(voterTile.getByAltText("Card picked")).toBeVisible({
      timeout: 15_000
    });
    timings.votePropagationRenderMs = Math.round(performance.now() - t0);

    // Reveal: host reveals; observer tab renders the results view.
    t0 = performance.now();
    await host.getByRole("button", { name: "Reveal Votes" }).click();
    await expect(observer.getByTestId("vote-distribution-chart")).toBeVisible({
      timeout: 15_000
    });
    timings.revealRenderMs = Math.round(performance.now() - t0);

    // New round: host resets; observer tab returns to the picking view.
    t0 = performance.now();
    await startNewRound(host);
    await expect(
      observer.getByTestId("vote-distribution-chart")
    ).not.toBeVisible({ timeout: 15_000 });
    timings.newRoundRenderMs = Math.round(performance.now() - t0);

    await testInfo.attach("timings", {
      body: JSON.stringify(
        { seededPlayers: SEED_PLAYERS, realTabs: REAL_GUESTS + 1, timings },
        null,
        2
      ),
      contentType: "application/json"
    });
    console.log("stress-browser timings (ms):", timings);

    for (const [name, ms] of Object.entries(timings)) {
      expect
        .soft(ms, `${name} should stay under ${RENDER_BUDGET_MS}ms under load`)
        .toBeLessThan(RENDER_BUDGET_MS);
    }
  });
});

function spawnSeeder(roomId: string): ChildProcess {
  return spawn(
    "npx",
    [
      "tsx",
      "src/cli.ts",
      "seed",
      // pin to the app's backend — a STRESS_TARGET_URL in the environment
      // must not point the seeded VUs at a different server than the tabs
      "--target",
      BACKEND,
      "--room",
      roomId,
      "--players",
      String(SEED_PLAYERS),
      "--chat-rate",
      "2"
    ],
    { cwd: STRESS_DIR, shell: true, stdio: ["ignore", "pipe", "pipe"] }
  );
}

function waitForSeedReady(seeder: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("seeder did not print SEED_READY within 60s")),
      60_000
    );
    let output = "";
    seeder.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes("SEED_READY")) {
        clearTimeout(timer);
        resolve();
      }
    });
    seeder.stderr?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    seeder.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`seeder exited early (code ${code}):\n${output}`));
    });
  });
}

function killSeeder(seeder: ChildProcess | undefined): void {
  if (!seeder || seeder.pid === undefined || seeder.killed) return;
  if (process.platform === "win32") {
    // shell:true wraps the real node process; taskkill /T gets the whole tree
    spawn("taskkill", ["/pid", String(seeder.pid), "/T", "/F"], {
      stdio: "ignore"
    });
  } else {
    seeder.kill("SIGTERM");
  }
}
