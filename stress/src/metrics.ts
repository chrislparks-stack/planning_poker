export interface HistSummary {
  p50: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
  count: number;
}

/** Stores raw values; percentiles from a sorted copy — fine at these volumes. */
export class Histogram {
  private values: number[] = [];

  record(ms: number): void {
    this.values.push(ms);
  }

  get count(): number {
    return this.values.length;
  }

  /** Raw recorded values — for merging histograms across rooms. */
  valuesRef(): readonly number[] {
    return this.values;
  }

  summary(): HistSummary {
    if (this.values.length === 0) {
      return { p50: 0, p95: 0, p99: 0, max: 0, mean: 0, count: 0 };
    }
    const sorted = [...this.values].sort((a, b) => a - b);
    const pct = (p: number) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    return {
      p50: round(pct(50)),
      p95: round(pct(95)),
      p99: round(pct(99)),
      max: round(sorted[sorted.length - 1] ?? 0),
      mean: round(mean),
      count: sorted.length
    };
  }
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface PropagationResult {
  /** Per-receiver latency in ms for those who saw the event in time */
  latencies: number[];
  /** Receiver ids that missed the deadline */
  missed: string[];
}

interface Expectation {
  sentAt: number;
  predicate: (payload: unknown) => boolean;
  pending: Set<string>;
  resolve: (r: PropagationResult) => void;
  latencies: number[];
  timer: NodeJS.Timeout;
  done: boolean;
}

/**
 * Correlates a mutation with its arrival on other VUs' subscription sockets.
 * Register an expectation before sending the distinguishing mutation; feed
 * every subscription payload through onEvent(receiverId, payload, receivedAt).
 */
export class PropagationTracker {
  readonly histogram: Histogram;
  timeouts = 0;
  private open: Expectation[] = [];

  /** Pass a shared Histogram to aggregate propagation across trackers (e.g. per-room). */
  constructor(histogram?: Histogram) {
    this.histogram = histogram ?? new Histogram();
  }

  expect(params: {
    sentAt: number;
    predicate: (payload: unknown) => boolean;
    receivers: string[];
    deadlineMs: number;
  }): Promise<PropagationResult> {
    return new Promise((resolve) => {
      const exp: Expectation = {
        sentAt: params.sentAt,
        predicate: params.predicate,
        pending: new Set(params.receivers),
        resolve,
        latencies: [],
        done: false,
        timer: setTimeout(() => this.finish(exp), params.deadlineMs)
      };
      if (exp.pending.size === 0) {
        clearTimeout(exp.timer);
        exp.done = true;
        resolve({ latencies: [], missed: [] });
        return;
      }
      this.open.push(exp);
    });
  }

  onEvent(receiverId: string, payload: unknown, receivedAt: number): void {
    for (const exp of this.open) {
      if (exp.done || !exp.pending.has(receiverId)) continue;
      let matched = false;
      try {
        matched = exp.predicate(payload);
      } catch {
        // predicate errors on unrelated payload shapes are not matches
      }
      if (!matched) continue;
      exp.pending.delete(receiverId);
      const latency = receivedAt - exp.sentAt;
      exp.latencies.push(latency);
      this.histogram.record(latency);
      if (exp.pending.size === 0) this.finish(exp);
    }
  }

  private finish(exp: Expectation): void {
    if (exp.done) return;
    exp.done = true;
    clearTimeout(exp.timer);
    this.timeouts += exp.pending.size;
    this.open = this.open.filter((e) => e !== exp);
    exp.resolve({ latencies: exp.latencies, missed: [...exp.pending] });
  }

  /** Resolve anything still open (e.g. at scenario teardown). */
  drain(): void {
    for (const exp of [...this.open]) this.finish(exp);
  }
}

export class Counters {
  errors = 0;
  timeouts = 0;
  wsDisconnects = 0;
}
