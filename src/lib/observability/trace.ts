type Level = "info" | "warn" | "error";

export function newTraceId(): string {
  return crypto.randomUUID();
}

export function logEvent(level: Level, event: string, payload: Record<string, unknown>): void {
  const line = JSON.stringify({
    level,
    event,
    ts: new Date().toISOString(),
    ...payload,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export async function traceAsync<T>(
  event: string,
  traceId: string,
  fn: () => Promise<T>,
  meta: Record<string, unknown> = {},
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logEvent("info", `${event}.ok`, { traceId, latencyMs: Date.now() - start, ...meta });
    return result;
  } catch (error) {
    logEvent("error", `${event}.fail`, {
      traceId,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
      ...meta,
    });
    throw error;
  }
}
