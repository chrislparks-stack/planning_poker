export interface TimedResult<T = unknown> {
  ok: boolean;
  /** Round-trip latency in ms (performance.now precision) */
  latencyMs: number;
  /** Epoch ms just before the request was sent — for propagation correlation */
  sentAt: number;
  data?: T;
  error?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function gqlPost<T = unknown>(
  httpUrl: string,
  query: string,
  variables: Record<string, unknown>,
  timeoutMs: number
): Promise<TimedResult<T>> {
  const sentAt = Date.now();
  const start = performance.now();
  try {
    const res = await fetch(httpUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    const latencyMs = performance.now() - start;
    if (!res.ok) {
      return { ok: false, latencyMs, sentAt, error: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as GraphQLResponse<T>;
    if (body.errors?.length) {
      return { ok: false, latencyMs, sentAt, error: body.errors.map((e) => e.message).join("; ") };
    }
    return { ok: true, latencyMs, sentAt, data: body.data };
  } catch (err) {
    return {
      ok: false,
      latencyMs: performance.now() - start,
      sentAt,
      error: err instanceof Error ? (err.name === "TimeoutError" ? "timeout" : err.message) : String(err)
    };
  }
}
