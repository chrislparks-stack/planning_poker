import { setTimeout as sleep } from "node:timers/promises";

export interface Target {
  /** e.g. http://localhost:8000/ — GraphQL POST endpoint */
  httpUrl: string;
  /** e.g. ws://localhost:8000/ — graphql-transport-ws endpoint */
  wsUrl: string;
  healthUrl: string;
  metricsUrl: string;
  isLocal: boolean;
  /** Used to key baseline files: <scenario>.<label>.json */
  label: "local" | "remote";
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function resolveTarget(cliTarget?: string): Target {
  const raw = cliTarget ?? process.env.STRESS_TARGET_URL ?? "http://localhost:8000";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    console.error(`Invalid target URL: ${raw}`);
    process.exit(1);
  }
  const isLocal = LOCAL_HOSTS.has(url.hostname);
  const base = `${url.protocol}//${url.host}`;
  const wsProto = url.protocol === "https:" ? "wss:" : "ws:";
  return {
    httpUrl: `${base}/`,
    wsUrl: `${wsProto}//${url.host}/`,
    healthUrl: `${base}/health_check`,
    metricsUrl: `${base}/metrics`,
    isLocal,
    label: isLocal ? "local" : "remote"
  };
}

export interface Intensity {
  vus: number;
  durationSec: number;
  chatRatePerSec?: number;
}

export const REMOTE_CLAMPS = { vus: 15, durationSec: 60, chatRatePerSec: 2 };

export interface GuardFlags {
  yesIAmLoadTestingProduction?: boolean;
  forceIntensity?: boolean;
}

/**
 * Refuse to hit non-local targets without the explicit opt-in flag, and clamp
 * intensity for remote targets unless --force-intensity. Returns the (possibly
 * clamped) intensity to run with.
 */
export async function enforceGuard(
  target: Target,
  flags: GuardFlags,
  intensity: Intensity
): Promise<Intensity> {
  if (target.isLocal) return intensity;

  if (!flags.yesIAmLoadTestingProduction) {
    console.error(
      `\nRefusing to run against non-local target ${target.httpUrl}\n` +
        `Load tests can degrade the live site for real users.\n` +
        `If you really mean it, pass --yes-i-am-load-testing-production\n`
    );
    process.exit(1);
  }

  let clamped = { ...intensity };
  if (!flags.forceIntensity) {
    clamped = {
      vus: Math.min(intensity.vus, REMOTE_CLAMPS.vus),
      durationSec: Math.min(intensity.durationSec, REMOTE_CLAMPS.durationSec),
      chatRatePerSec:
        intensity.chatRatePerSec === undefined
          ? undefined
          : Math.min(intensity.chatRatePerSec, REMOTE_CLAMPS.chatRatePerSec)
    };
  }

  const banner = [
    "!".repeat(72),
    `  TARGETING REMOTE HOST: ${target.httpUrl}`,
    `  vus=${clamped.vus} durationSec=${clamped.durationSec}` +
      (clamped.chatRatePerSec !== undefined ? ` chatRate=${clamped.chatRatePerSec}/s` : ""),
    !flags.forceIntensity && (clamped.vus !== intensity.vus || clamped.durationSec !== intensity.durationSec)
      ? "  (intensity clamped for remote target — use --force-intensity to override)"
      : null,
    "  Starting in 5 seconds — Ctrl+C to abort.",
    "!".repeat(72)
  ].filter(Boolean);
  console.error("\x1b[31m%s\x1b[0m", banner.join("\n"));
  await sleep(5000);
  return clamped;
}

export async function preflight(target: Target): Promise<void> {
  let problem: string | null = null;
  try {
    const res = await fetch(target.healthUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) problem = `health_check returned ${res.status}`;
  } catch (err) {
    problem = err instanceof Error ? err.message : String(err);
  }
  if (problem) {
    console.error(
      `\nCannot reach server at ${target.healthUrl} (${problem})\n` +
        `Is the server running? For local testing start it with:\n` +
        `  cd server && HEARTBEAT_INTERVAL_SECS=1 RUST_LOG=warn cargo run --release\n`
    );
    process.exit(1);
  }
}
