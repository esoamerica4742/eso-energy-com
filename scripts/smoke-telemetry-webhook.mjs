/**
 * Production smoke test for enterprise telemetry webhook.
 *
 * Required env:
 * - TELEMETRY_WEBHOOK_URL (e.g. https://app.eso-energy.com/api/webhook/telemetry)
 * - ENODE_WEBHOOK_SECRET
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - SMOKE_TENANT_ID
 * - SMOKE_SITE_ID
 * - SMOKE_DEVICE_ID
 *
 * Optional:
 * - SMOKE_SOURCE ("enode" | "solarman"), default "enode"
 */
import { createHmac, randomUUID } from "node:crypto";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv();

const cfg = {
  webhookUrl: process.env.TELEMETRY_WEBHOOK_URL,
  source: process.env.SMOKE_SOURCE === "solarman" ? "solarman" : "enode",
  secret: process.env.ENODE_WEBHOOK_SECRET,
  supabaseUrl: process.env.SUPABASE_URL,
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
  tenantId: process.env.SMOKE_TENANT_ID,
  siteId: process.env.SMOKE_SITE_ID,
  deviceId: process.env.SMOKE_DEVICE_ID,
};

for (const [k, v] of Object.entries(cfg)) {
  if (!v) {
    console.error(`Missing required env: ${k}`);
    process.exit(1);
  }
}

const traceId = randomUUID();
const now = new Date().toISOString();
const payload = {
  source: cfg.source,
  tenant_id: cfg.tenantId,
  site_id: cfg.siteId,
  device_id: cfg.deviceId,
  solar_output_kw: 2.41,
  load_draw_kw: 1.97,
  battery_soc_percent: 74.2,
  battery_voltage: 51.8,
  inverter_status: "online",
  grid_status: "available",
  generator_status: "off",
  inverter_temperature: 42.1,
  daily_energy_kwh: 18.9,
  total_energy_kwh: 10284.4,
  fault_code: null,
  warning_code: null,
  system_timestamp: now,
  last_seen: now,
  raw: { smoke: true, traceId },
};
const body = JSON.stringify(payload);
const sig = createHmac("sha256", cfg.secret).update(body).digest("hex");

const start = Date.now();
const res = await fetch(cfg.webhookUrl, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-telemetry-source": cfg.source,
    "x-trace-id": traceId,
    "x-enode-signature": `sha256=${sig}`,
  },
  body,
});
const webhookLatency = Date.now() - start;
const webhookJson = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("Webhook failed:", res.status, webhookJson);
  process.exit(1);
}

// Verify latest state reflected in DB
const verifyRes = await fetch(
  `${cfg.supabaseUrl}/rest/v1/telemetry_latest_state?select=device_id,tenant_id,system_timestamp,updated_at,solar_output_kw,load_draw_kw&tenant_id=eq.${cfg.tenantId}&device_id=eq.${cfg.deviceId}&limit=1`,
  {
    headers: {
      apikey: cfg.serviceRole,
      authorization: `Bearer ${cfg.serviceRole}`,
    },
  },
);
if (!verifyRes.ok) {
  console.error("Verification query failed:", verifyRes.status, await verifyRes.text());
  process.exit(1);
}
const rows = await verifyRes.json();
if (!Array.isArray(rows) || rows.length === 0) {
  console.error("No telemetry_latest_state row found for smoke device");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      traceId,
      webhookStatus: res.status,
      webhookLatencyMs: webhookLatency,
      webhookResponse: webhookJson,
      latestRow: rows[0],
    },
    null,
    2,
  ),
);
