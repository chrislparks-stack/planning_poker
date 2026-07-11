#!/usr/bin/env node
/**
 * Runs the entire test suite in one command:
 *
 *   node test-all.mjs
 *
 * Sequence: client unit tests → client e2e (functional + game correctness) →
 * protocol stress scenarios (smoke, vote-cycle, chat-storm, multi-room, with
 * baseline regression comparison) → browser stress test (rendering under load).
 *
 * Prerequisites (checked up front):
 *   - backend on :8000  → cd server && HEARTBEAT_INTERVAL_SECS=1 RUST_LOG=warn cargo run --profile bench-release
 *   - vite on :5173     → cd client && npm run dev
 *
 * Stress scenarios compare against your local baselines (stress/baselines/) —
 * for meaningful comparisons, run the server with the same cargo profile the
 * baselines were recorded with. Set STRESS_TARGET_URL to stress a different
 * server than the one the browser tests use.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.join(ROOT, "client");
const STRESS = path.join(ROOT, "stress");

const BACKEND = process.env.STRESS_TARGET_URL ?? "http://localhost:8000";
const APP = "http://localhost:5173";

async function reachable(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(3000) })).ok;
  } catch {
    return false;
  }
}

const [backendUp, appUp] = await Promise.all([
  reachable(`${BACKEND.replace(/\/$/, "")}/health_check`),
  reachable(APP)
]);
if (!backendUp || !appUp) {
  if (!backendUp) {
    console.error(`Backend not reachable at ${BACKEND} — start it with:`);
    console.error("  cd server && HEARTBEAT_INTERVAL_SECS=1 RUST_LOG=warn cargo run --profile bench-release");
  }
  if (!appUp) {
    console.error(`Vite dev server not reachable at ${APP} — start it with:`);
    console.error("  cd client && npm run dev");
  }
  process.exit(1);
}

const results = [];

function run(name, cwd, command, args) {
  console.log(`\n${"=".repeat(70)}\n  ${name}\n${"=".repeat(70)}`);
  const res = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      // don't auto-open the Playwright HTML report browser on failures
      PW_TEST_HTML_REPORT_OPEN: "never"
    }
  });
  results.push({ name, ok: res.status === 0 });
}

run("Client unit tests (vitest)", CLIENT, "npx", ["vitest", "run"]);
run("Client e2e: functional + game correctness (playwright)", CLIENT, "npm", ["run", "test:e2e"]);
run("Stress: smoke (harness self-test)", STRESS, "npm", ["run", "smoke"]);
run("Stress: vote-cycle (latency + propagation vs baseline)", STRESS, "npm", ["run", "vote-cycle"]);
run("Stress: chat-storm (throughput vs baseline)", STRESS, "npm", ["run", "chat-storm"]);
run("Stress: multi-room (fan-out/contention vs baseline)", STRESS, "npm", ["run", "multi-room"]);
run("Browser stress: rendering under load (playwright)", CLIENT, "npm", ["run", "test:stress:browser"]);

console.log(`\n${"=".repeat(70)}\n  RESULTS\n${"=".repeat(70)}`);
for (const { name, ok } of results) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(failed === 0 ? "\nAll suites passed." : `\n${failed} suite(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
