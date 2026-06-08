import { createHash } from "node:crypto";
import { z } from "zod";
import type { NormalizedTelemetry, TelemetryWebhookPayload } from "@/lib/telemetry/types";

const payloadSchema = z.object({
  source: z.enum(["enode", "solarman"]),
  tenant_id: z.string().uuid(),
  site_id: z.string().uuid(),
  device_id: z.string().uuid(),
  solar_output_kw: z.number().optional(),
  load_draw_kw: z.number().optional(),
  battery_soc_percent: z.number().optional(),
  battery_voltage: z.number().optional(),
  inverter_status: z.string().optional(),
  grid_status: z.string().optional(),
  generator_status: z.string().optional(),
  inverter_temperature: z.number().optional(),
  daily_energy_kwh: z.number().optional(),
  total_energy_kwh: z.number().optional(),
  fault_code: z.string().nullable().optional(),
  warning_code: z.string().nullable().optional(),
  system_timestamp: z.string().optional(),
  last_seen: z.string().optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
});

function toUtcIso(input?: string): string {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function normalizeStatus(v: string | undefined, fallback: string): string {
  return (v ?? fallback).trim().toLowerCase();
}

function clampNullable(value: number | undefined, min: number, max: number): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(min, Math.min(max, value));
}

function n0(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return value;
}

export function normalizeTelemetryPayload(raw: TelemetryWebhookPayload): NormalizedTelemetry {
  const p = payloadSchema.parse(raw);
  const systemTimestamp = toUtcIso(p.system_timestamp);
  const lastSeen = toUtcIso(p.last_seen ?? p.system_timestamp);
  const rawPayload = p.raw ?? (raw as unknown as Record<string, unknown>);

  const normalized: Omit<NormalizedTelemetry, "telemetryHash"> = {
    source: p.source,
    tenantId: p.tenant_id,
    siteId: p.site_id,
    deviceId: p.device_id,
    solarOutputKw: n0(p.solar_output_kw),
    loadDrawKw: n0(p.load_draw_kw),
    batterySocPercent: clampNullable(p.battery_soc_percent, 0, 100),
    batteryVoltage: clampNullable(p.battery_voltage, 0, 2000),
    inverterStatus: normalizeStatus(p.inverter_status, "unknown"),
    gridStatus: normalizeStatus(p.grid_status, "unknown"),
    generatorStatus: normalizeStatus(p.generator_status, "unknown"),
    inverterTemperature: clampNullable(p.inverter_temperature, -50, 200),
    dailyEnergyKwh: clampNullable(p.daily_energy_kwh, 0, 1_000_000),
    totalEnergyKwh: clampNullable(p.total_energy_kwh, 0, 1_000_000_000),
    faultCode: p.fault_code ?? null,
    warningCode: p.warning_code ?? null,
    systemTimestamp,
    lastSeen,
    rawPayload,
  };

  const hashBase = [
    normalized.tenantId,
    normalized.siteId,
    normalized.deviceId,
    normalized.solarOutputKw.toFixed(4),
    normalized.loadDrawKw.toFixed(4),
    normalized.batterySocPercent ?? "null",
    normalized.batteryVoltage ?? "null",
    normalized.inverterStatus,
    normalized.gridStatus,
    normalized.generatorStatus,
    normalized.inverterTemperature ?? "null",
    normalized.dailyEnergyKwh ?? "null",
    normalized.totalEnergyKwh ?? "null",
    normalized.faultCode ?? "null",
    normalized.warningCode ?? "null",
    normalized.systemTimestamp,
  ].join("|");

  return {
    ...normalized,
    telemetryHash: createHash("sha256").update(hashBase).digest("hex"),
  };
}
