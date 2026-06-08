import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeTelemetryPayload } from "@/lib/telemetry/normalize";
import {
  readTelemetryCache,
  releaseDeviceLock,
  telemetryCacheKey,
  telemetryLockKey,
  tryAcquireDeviceLock,
  writeTelemetryCache,
} from "@/lib/telemetry/guardrails";
import type { TelemetryIngestResult, TelemetryWebhookPayload } from "@/lib/telemetry/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;
const replayGuard = new Map<string, number>();
const REPLAY_WINDOW_MS = 10 * 60_000;

function safeEqHex(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function extractSignature(raw: string | null): string | null {
  if (!raw) return null;
  return raw.replace(/^sha256=/i, "").trim().toLowerCase();
}

export function verifyTelemetrySignature(
  source: "enode" | "solarman",
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret =
    source === "enode"
      ? process.env.ENODE_WEBHOOK_SECRET
      : process.env.SOLARMAN_WEBHOOK_SECRET;
  if (!secret) return false;
  const received = extractSignature(signatureHeader);
  if (!received) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqHex(received, expected);
}

function isReplay(traceId: string): boolean {
  const now = Date.now();
  for (const [k, v] of replayGuard.entries()) {
    if (v < now) replayGuard.delete(k);
  }
  const seen = replayGuard.get(traceId);
  if (seen && seen > now) return true;
  replayGuard.set(traceId, now + REPLAY_WINDOW_MS);
  return false;
}

function logTelemetry(level: "info" | "warn" | "error", msg: string, extra: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    subsystem: "telemetry-ingest",
    msg,
    ts: new Date().toISOString(),
    ...extra,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export async function ingestTelemetryWebhook(
  payload: TelemetryWebhookPayload,
  opts: { traceId?: string; allowStaleCache?: boolean } = {},
): Promise<TelemetryIngestResult> {
  const started = Date.now();
  const traceId = opts.traceId ?? randomUUID();
  const normalized = normalizeTelemetryPayload(payload);
  const cacheKey = telemetryCacheKey(normalized.tenantId, normalized.deviceId);
  const lockKey = telemetryLockKey(normalized.tenantId, normalized.deviceId);
  const cacheRead = readTelemetryCache(cacheKey);

  if (cacheRead.hit && !cacheRead.stale) {
    return {
      cacheHit: true,
      persisted: false,
      changed: false,
      changedFields: [],
      staleRevalidated: false,
      latencyMs: Date.now() - started,
      traceId,
    };
  }

  const locked = tryAcquireDeviceLock(lockKey);
  if (!locked && cacheRead.hit && opts.allowStaleCache !== false) {
    return {
      cacheHit: true,
      persisted: false,
      changed: false,
      changedFields: [],
      staleRevalidated: true,
      latencyMs: Date.now() - started,
      traceId,
    };
  }

  try {
    if (isReplay(traceId)) {
      return {
        cacheHit: false,
        persisted: false,
        changed: false,
        changedFields: [],
        staleRevalidated: false,
        latencyMs: Date.now() - started,
        traceId,
      };
    }

    const { data, error } = await db.rpc("ingest_telemetry_log", {
      p_tenant_id: normalized.tenantId,
      p_site_id: normalized.siteId,
      p_device_id: normalized.deviceId,
      p_solar_output_kw: normalized.solarOutputKw,
      p_load_draw_kw: normalized.loadDrawKw,
      p_battery_soc_percent: normalized.batterySocPercent,
      p_battery_voltage: normalized.batteryVoltage,
      p_inverter_status: normalized.inverterStatus,
      p_grid_status: normalized.gridStatus,
      p_generator_status: normalized.generatorStatus,
      p_inverter_temperature: normalized.inverterTemperature,
      p_daily_energy_kwh: normalized.dailyEnergyKwh,
      p_total_energy_kwh: normalized.totalEnergyKwh,
      p_fault_code: normalized.faultCode,
      p_warning_code: normalized.warningCode,
      p_raw_payload: normalized.rawPayload,
      p_telemetry_hash: normalized.telemetryHash,
      p_system_timestamp: normalized.systemTimestamp,
      p_delta_threshold: 0.2,
    });

    if (error) throw new Error(error.message);
    writeTelemetryCache(cacheKey, normalized);
    await db.rpc("refresh_telemetry_site_summary", {
      p_tenant_id: normalized.tenantId,
      p_site_id: normalized.siteId,
    });

    const changedFields = Array.isArray(data?.changed_fields)
      ? (data.changed_fields as string[])
      : [];
    const result: TelemetryIngestResult = {
      cacheHit: false,
      persisted: Boolean(data?.persisted),
      changed: Boolean(data?.changed),
      changedFields,
      staleRevalidated: false,
      latencyMs: Date.now() - started,
      traceId,
    };
    logTelemetry("info", "telemetry_ingested", {
      traceId,
      tenantId: normalized.tenantId,
      siteId: normalized.siteId,
      deviceId: normalized.deviceId,
      persisted: result.persisted,
      latencyMs: result.latencyMs,
      changedFields,
    });
    return result;
  } catch (error) {
    logTelemetry("error", "telemetry_ingest_failed", {
      traceId,
      tenantId: normalized.tenantId,
      siteId: normalized.siteId,
      deviceId: normalized.deviceId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    if (locked) releaseDeviceLock(lockKey);
  }
}
