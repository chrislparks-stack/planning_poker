# Stress Testing

Protocol-level load tests for Summit Planning Poker. Virtual users (VUs) speak the
real wire protocol — GraphQL mutations over HTTP POST and subscriptions over
`graphql-transport-ws`, using the same `graphql-ws` library as the SPA — so no
browsers are needed to simulate hundreds of players. A separate Playwright spec
(`client/tests/stress-browser.spec.ts`) covers client-side rendering under load.

## Setup

```sh
cd stress
npm install
```

Start the server for testing (Git Bash):

```sh
cd server && HEARTBEAT_INTERVAL_SECS=1 RUST_LOG=warn cargo run --profile bench-release
```

PowerShell equivalent:

```powershell
cd server; $env:HEARTBEAT_INTERVAL_SECS="1"; $env:RUST_LOG="warn"; cargo run --profile bench-release
```

- `HEARTBEAT_INTERVAL_SECS=1` — the harness samples the server's Prometheus `/metrics`
  (memory, CPU) during runs; most gauges only refresh on this heartbeat (default 60s).
- `RUST_LOG=warn` — default logging prints every request, which skews CPU numbers under load.
- `--profile bench-release` is a speed-optimized build; the plain `release` profile is
  size-optimized. Any profile works for *relative* comparisons — just be consistent, and
  record it with `--server-profile <name>` (stored in reports/baselines, informational).

## Scenarios

All commands run from `stress/`. Extra flags go after `--`.

| Command | What it measures |
|---|---|
| `npm run find-limits` | **All capacity ramps in one run → CAPACITY REPORT with your actual maximums** |
| `npm run smoke` | Harness self-test: 5 VUs vote/reveal/chat; fails if any event is missed |
| `npm run room-capacity` | Ramps players into one room until latency degrades → **max players/room** |
| `npm run rooms-capacity` | Ramps concurrent active rooms until latency degrades → **max rooms** |
| `npm run throughput` | Ramps raw mutation rate until the latency knee → **max server calls/sec** |
| `npm run vote-cycle` | Vote → reveal → reset cycles: pickCard latency + propagation to all subscribers |
| `npm run chat-storm` | Chat throughput: send latency + propagation at a target msg/s rate |
| `npm run multi-room` | Many rooms voting concurrently: broker fan-out + global mutex contention |
| `npm run soak` | Sustained mixed load; watches server memory slope for leaks |
| `npm run seed` | Holds VUs in an existing room (background load for the browser spec) |

Examples:

```sh
npm run smoke
npm run room-capacity -- --max-players 500 --step 25 --timeout-ms 15000
npm run vote-cycle -- --players 50 --cycles 10
npm run chat-storm -- --players 30 --ramp "5,10,25,50" --duration 20
npm run multi-room -- --rooms 100 --players-per-room 4
npm run soak -- --duration 1800
```

Useful shared flags: `--verbose`, `--full-payload` (client-fidelity subscription
payloads incl. chat history, instead of lean selections), `--timeout-ms <ms>`
(raise for capacity runs under intentional saturation), `--report <path>`.

Every run reports client-side p50/p95/p99 latencies, **propagation latency**
(mutation sent → event received on every other VU's socket), error/timeout counts,
and server memory/CPU sampled from `/metrics`. Reports are written to
`stress/results/` (git-ignored).

## Finding your maximums

```sh
npm run find-limits        # ~5-10 min; restart the server first for a clean run
```

Runs three ramps back to back and prints a CAPACITY REPORT:

1. **Max players in one room** — adds players until join latency or vote
   propagation degrades (each join broadcasts a full snapshot to all N
   subscribers, so this cost is inherently O(N²) per batch).
2. **Max concurrent active rooms** — adds rooms of 4 until mutation latency or
   propagation degrades (all rooms share one storage mutex, and the broker
   clones every publish to all subscribers across all rooms).
3. **Max server calls/sec** — ramps the raw mutation rate until the latency
   knee (p95 > 150ms), the achieved rate falls behind the target, or calls fail.

Each ramp also prints its full latency-vs-load curve so you can see where
degradation starts, not just where it fails; the curves are saved in the run's
JSON report. A `+` after a number means the test cap was reached with no
degradation — raise `--max-players` / `--max-rooms` / `--rates` to push higher.
The numbers are ceilings for *your machine + server build* (the harness shares
the same CPU); treat them as relative baselines, not production guarantees.

## Baselines & regression checks

Baselines live in `stress/baselines/<scenario>.<local|remote>.json`. Local
baselines are machine-specific (the numbers depend on your hardware), so
`*.local.json` is git-ignored — create yours once with `npm run baseline:all`.
When a baseline exists and the run used the same params, every run auto-compares
and **exits 1** if a metric's p95 regressed more than 20% AND more than 15ms
absolute (`--compare-tolerance` / `--compare-floor-ms` to adjust — the floor
absorbs scheduler jitter on low-ms metrics when server and harness share one
machine), or if errors/timeouts increased.

```sh
npm run vote-cycle                      # auto-compares against the committed baseline
npm run vote-cycle -- --save-baseline   # bless the current run as the new baseline
npm run baseline:all                    # re-baseline vote-cycle, chat-storm, multi-room
npm run vote-cycle -- --compare-tolerance 10   # stricter gate
```

Typical workflow: before merging a server/client change, run `npm run vote-cycle`,
`npm run chat-storm`, and `npm run multi-room` with default params and check the
PASS/FAIL table. Re-baseline (on the same machine/profile as the old baseline) when
a change intentionally alters performance.

## Browser rendering under load

```sh
# needs: server on 8000, vite dev server on 5173, stress/ npm-installed
cd client && npm run test:stress:browser
```

Seeds a room with 40 protocol-level VUs (light vote/chat churn), opens 4 real
browser tabs, and measures cross-tab click-to-render for votes, reveal, and
new-round (soft 2s budget; timings attached to the Playwright report). Excluded
from `npm run test:e2e`.

## Targeting production

Runs refuse non-local targets unless you really mean it, and clamp intensity
(≤15 VUs, ≤60s, ≤2 chat msg/s) unless `--force-intensity`:

```sh
STRESS_TARGET_URL=https://<prod-graphql-host> npm run smoke -- --yes-i-am-load-testing-production
```

Remote baselines are keyed separately (`<scenario>.remote.json`). Note the GraphQL
API host may differ from the site domain — check `client/.env.production.local`.

## Interpreting results (architecture notes)

- All rooms share one `Mutex<HashMap>`; every mutation locks it. Contention shows up
  first in `multi-room` mutation p95s.
- The broker clones each published event to **all** subscribers of that type across
  **all** rooms before per-room filtering — propagation cost scales with total
  subscriber count, not room size. Compare `multi-room` vs `vote-cycle` at the same
  total VU count.
- Subscriber channels are unbounded — slow consumers grow server memory. Watch
  `serverMemSlopeMiBPerMin` in `soak` runs (only meaningful on long runs).
- Each room event carries a full room snapshot (users array), so join cost in
  `room-capacity` is inherently O(N) per join, O(N²) per batch.
