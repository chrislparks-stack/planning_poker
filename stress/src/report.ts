import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

import type { HistSummary } from "./metrics.js";
import type { ServerSummary } from "./server-metrics.js";

const STRESS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const RESULTS_DIR = path.join(STRESS_ROOT, "results");
export const BASELINES_DIR = path.join(STRESS_ROOT, "baselines");

export type MetricValue = HistSummary | number;

export interface Report {
  schemaVersion: 1;
  scenario: string;
  createdAt: string;
  target: "local" | "remote";
  params: Record<string, unknown>;
  git: { branch: string; commit: string };
  env: { os: string; node: string; cpus: number; serverProfile: string };
  metrics: Record<string, MetricValue>;
  server: ServerSummary | null;
  series?: Record<string, unknown>;
}

function gitInfo(): { branch: string; commit: string } {
  try {
    const opts = {
      cwd: STRESS_ROOT,
      encoding: "utf8" as const,
      stdio: ["ignore", "pipe", "ignore"] as ["ignore", "pipe", "ignore"]
    };
    return {
      branch: execSync("git rev-parse --abbrev-ref HEAD", opts).trim(),
      commit: execSync("git rev-parse --short HEAD", opts).trim()
    };
  } catch {
    return { branch: "unknown", commit: "unknown" };
  }
}

export function buildReport(input: {
  scenario: string;
  target: "local" | "remote";
  params: Record<string, unknown>;
  serverProfile: string;
  metrics: Record<string, MetricValue>;
  server: ServerSummary | null;
  series?: Record<string, unknown>;
}): Report {
  return {
    schemaVersion: 1,
    scenario: input.scenario,
    createdAt: new Date().toISOString(),
    target: input.target,
    params: input.params,
    git: gitInfo(),
    env: {
      os: process.platform,
      node: process.version,
      cpus: os.cpus().length,
      serverProfile: input.serverProfile
    },
    metrics: input.metrics,
    server: input.server,
    series: input.series
  };
}

export function writeReport(report: Report, reportPath?: string): string {
  const file =
    reportPath ??
    path.join(RESULTS_DIR, `${report.scenario}-${report.createdAt.replace(/[:.]/g, "-")}.json`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}

export function baselinePath(scenario: string, target: "local" | "remote"): string {
  return path.join(BASELINES_DIR, `${scenario}.${target}.json`);
}

export function loadBaseline(scenario: string, target: "local" | "remote"): Report | null {
  const p = baselinePath(scenario, target);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as Report;
  } catch {
    console.error(`Warning: could not parse baseline ${p}`);
    return null;
  }
}

export async function saveBaseline(report: Report, skipConfirm: boolean): Promise<string> {
  const p = baselinePath(report.scenario, report.target);
  if (existsSync(p) && !skipConfirm) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`Overwrite existing baseline ${path.basename(p)}? [y/N] `);
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) {
      console.log("Baseline not saved.");
      return p;
    }
  }
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(report, null, 2));
  console.log(`Baseline saved: ${p}`);
  return p;
}

function isHist(v: MetricValue): v is HistSummary {
  return typeof v === "object" && v !== null && "p95" in v;
}

export function printMetrics(metrics: Record<string, MetricValue>, server: ServerSummary | null): void {
  const rows: Array<Record<string, string | number>> = [];
  for (const [name, v] of Object.entries(metrics)) {
    if (isHist(v)) {
      rows.push({ metric: name, p50: v.p50, p95: v.p95, p99: v.p99, max: v.max, count: v.count });
    } else {
      rows.push({ metric: name, p50: "", p95: "", p99: "", max: "", count: v });
    }
  }
  console.table(rows);
  if (server) {
    console.log(
      `server: mem ${server.memMiB.min}-${server.memMiB.max} MiB (mean ${server.memMiB.mean}), ` +
        `cpu ${server.cpuPct.min}-${server.cpuPct.max}% (mean ${server.cpuPct.mean}), ` +
        `${server.sampleCount} samples`
    );
  } else {
    console.log("server: no /metrics samples collected");
  }
}

export interface CompareOutcome {
  ran: boolean;
  pass: boolean;
}

/**
 * Regression rule: p95 > baseline * (1 + tolerance) AND absolute delta >
 * floorMs, or any increase in error/timeout counters. The absolute floor
 * absorbs scheduler jitter on low-double-digit-ms metrics when server and
 * harness share one machine — real regressions in this architecture (global
 * mutex, per-subscriber fan-out) show up as multiples, not +10ms.
 */
export function compareToBaseline(
  report: Report,
  baseline: Report,
  tolerancePct: number,
  floorMs = 15
): CompareOutcome {
  const sameParams = JSON.stringify(report.params) === JSON.stringify(baseline.params);
  if (!sameParams) {
    console.log(
      `\nSkipping baseline comparison: run params ${JSON.stringify(report.params)} ` +
        `differ from baseline params ${JSON.stringify(baseline.params)}.`
    );
    return { ran: false, pass: true };
  }

  const tol = tolerancePct / 100;
  const rows: Array<Record<string, string | number>> = [];
  let pass = true;

  for (const [name, cur] of Object.entries(report.metrics)) {
    const base = baseline.metrics[name];
    if (base === undefined) continue;
    if (isHist(cur) && isHist(base)) {
      const regressed = cur.p95 > base.p95 * (1 + tol) && cur.p95 - base.p95 > floorMs;
      if (regressed) pass = false;
      const deltaPct = base.p95 === 0 ? 0 : Math.round(((cur.p95 - base.p95) / base.p95) * 1000) / 10;
      rows.push({
        metric: `${name} (p95)`,
        baseline: base.p95,
        current: cur.p95,
        "delta%": deltaPct,
        result: regressed ? "FAIL" : "PASS"
      });
    } else if (typeof cur === "number" && typeof base === "number") {
      const isErrorCounter = /error|timeout|disconnect/i.test(name);
      const regressed = isErrorCounter && cur > base;
      if (regressed) pass = false;
      rows.push({ metric: name, baseline: base, current: cur, "delta%": "", result: regressed ? "FAIL" : "PASS" });
    }
  }

  console.log(
    `\nBaseline comparison (${baseline.createdAt}, commit ${baseline.git.commit}, tolerance ${tolerancePct}% + ${floorMs}ms floor):`
  );
  console.table(rows);
  console.log(pass ? "RESULT: PASS" : "RESULT: FAIL (performance regression detected)");
  return { ran: true, pass };
}
