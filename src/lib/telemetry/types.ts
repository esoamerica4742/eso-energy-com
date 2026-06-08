export type TelemetrySource = "enode" | "solarman";

export type TelemetryWebhookPayload = {
  source: TelemetrySource;
  tenant_id: string;
  site_id: string;
  device_id: string;
  solar_output_kw?: number;
  load_draw_kw?: number;
  battery_soc_percent?: number;
  battery_voltage?: number;
  inverter_status?: string;
  grid_status?: string;
  generator_status?: string;
  inverter_temperature?: number;
  daily_energy_kwh?: number;
  total_energy_kwh?: number;
  fault_code?: string | null;
  warning_code?: string | null;
  system_timestamp?: string;
  last_seen?: string;
  raw?: Record<string, unknown>;
};

export type NormalizedTelemetry = {
  source: TelemetrySource;
  tenantId: string;
  siteId: string;
  deviceId: string;
  solarOutputKw: number;
  loadDrawKw: number;
  batterySocPercent: number | null;
  batteryVoltage: number | null;
  inverterStatus: string;
  gridStatus: string;
  generatorStatus: string;
  inverterTemperature: number | null;
  dailyEnergyKwh: number | null;
  totalEnergyKwh: number | null;
  faultCode: string | null;
  warningCode: string | null;
  systemTimestamp: string;
  lastSeen: string;
  rawPayload: Record<string, unknown>;
  telemetryHash: string;
};

export type TelemetryIngestResult = {
  cacheHit: boolean;
  persisted: boolean;
  changed: boolean;
  changedFields: string[];
  staleRevalidated: boolean;
  latencyMs: number;
  traceId: string;
};
