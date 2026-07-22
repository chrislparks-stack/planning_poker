export interface ServerSample {
  t: number;
  memMiB: number;
  cpuPct: number;
  totalUsers: number;
  rooms: number;
}

export interface ServerSummary {
  memMiB: { min: number; max: number; mean: number };
  cpuPct: { min: number; max: number; mean: number };
  totalUsersMax: number;
  sampleCount: number;
}

const GAUGES = ["process_memory_mib", "process_cpu_percent_x100", "rooms_total_users", "rooms_current"] as const;

function parseMetrics(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of text.split("\n")) {
    if (line.startsWith("#")) continue;
    const m = /^(\w+)\s+([\d.]+)/.exec(line);
    if (m && m[1] && m[2] !== undefined && (GAUGES as readonly string[]).includes(m[1])) {
      out[m[1]] = Number(m[2]);
    }
  }
  return out;
}

/**
 * Polls the server's Prometheus /metrics endpoint during a run. Most gauges
 * are refreshed by the server's heartbeat task (default 60s) — run the server
 * with HEARTBEAT_INTERVAL_SECS=1 for useful resolution.
 */
export class ServerMetricsSampler {
  readonly samples: ServerSample[] = [];
  private timer: NodeJS.Timeout | null = null;
  private failures = 0;

  constructor(
    private readonly metricsUrl: string,
    private readonly intervalMs = 1500
  ) {}

  start(): void {
    const poll = async () => {
      try {
        const res = await fetch(this.metricsUrl, { signal: AbortSignal.timeout(this.intervalMs) });
        if (!res.ok) {
          this.failures++;
          return;
        }
        const g = parseMetrics(await res.text());
        this.samples.push({
          t: Date.now(),
          memMiB: g["process_memory_mib"] ?? 0,
          cpuPct: (g["process_cpu_percent_x100"] ?? 0) / 100,
          totalUsers: g["rooms_total_users"] ?? 0,
          rooms: g["rooms_current"] ?? 0
        });
      } catch {
        this.failures++;
      }
    };
    void poll();
    this.timer = setInterval(poll, this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  summary(): ServerSummary | null {
    if (this.samples.length === 0) return null;
    const stat = (vals: number[]) => ({
      min: Math.min(...vals),
      max: Math.max(...vals),
      mean: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    });
    return {
      memMiB: stat(this.samples.map((s) => s.memMiB)),
      cpuPct: stat(this.samples.map((s) => s.cpuPct)),
      totalUsersMax: Math.max(...this.samples.map((s) => s.totalUsers)),
      sampleCount: this.samples.length
    };
  }

  /** True when gauges never changed across a long run — heartbeat probably slow. */
  looksStale(runDurationMs: number): boolean {
    if (runDurationMs < 65_000 || this.samples.length < 5) return false;
    const first = this.samples[0];
    if (!first) return false;
    return this.samples.every((s) => s.memMiB === first.memMiB && s.cpuPct === first.cpuPct);
  }

  /** Least-squares slope of memory usage in MiB/min (for soak leak detection). */
  memorySlopeMiBPerMin(): number | null {
    if (this.samples.length < 5) return null;
    const t0 = this.samples[0]!.t;
    const xs = this.samples.map((s) => (s.t - t0) / 60_000);
    const ys = this.samples.map((s) => s.memMiB);
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i]! - mx) * (ys[i]! - my);
      den += (xs[i]! - mx) ** 2;
    }
    return den === 0 ? null : Math.round((num / den) * 100) / 100;
  }
}
