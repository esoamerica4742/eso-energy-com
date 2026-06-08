import type { NormalizedTelemetry } from "@/lib/telemetry/types";

const FIVE_MIN_MS = 300_000;
const STALE_WHILE_REVALIDATE_MS = 90_000;
const inMemoryCache = new Map<string, { value: NormalizedTelemetry; expiresAt: number; staleAt: number }>();
const lockMap = new Map<string, number>();

export const TELEMETRY_SYNC_INTERVAL_MS = FIVE_MIN_MS;

export type CacheRead =
  | { hit: false }
  | { hit: true; stale: boolean; value: NormalizedTelemetry };

function nowMs(): number {
  return Date.now();
}

export function telemetryCacheKey(tenantId: string, deviceId: string): string {
  return `telemetry:v1:${tenantId}:${deviceId}`;
}

export function telemetryLockKey(tenantId: string, deviceId: string): string {
  return `telemetry:lock:${tenantId}:${deviceId}`;
}

export function readTelemetryCache(key: string): CacheRead {
  const v = inMemoryCache.get(key);
  if (!v) return { hit: false };
  const now = nowMs();
  if (v.expiresAt <= now) {
    inMemoryCache.delete(key);
    return { hit: false };
  }
  return { hit: true, stale: v.staleAt <= now, value: v.value };
}

export function writeTelemetryCache(key: string, value: NormalizedTelemetry): void {
  const now = nowMs();
  inMemoryCache.set(key, {
    value,
    expiresAt: now + FIVE_MIN_MS + STALE_WHILE_REVALIDATE_MS,
    staleAt: now + FIVE_MIN_MS,
  });
}

export function tryAcquireDeviceLock(lockKey: string, ttlMs = 15_000): boolean {
  const now = nowMs();
  const existing = lockMap.get(lockKey);
  if (existing && existing > now) return false;
  lockMap.set(lockKey, now + ttlMs);
  return true;
}

export function releaseDeviceLock(lockKey: string): void {
  lockMap.delete(lockKey);
}
