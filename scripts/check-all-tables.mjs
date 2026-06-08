/**
 * Verify critical Supabase tables exist.
 */
import pg from "pg";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv({ force: true });

const tables = [
  "profiles",
  "user_security_settings",
  "branches",
  "sites",
  "enode_connections",
  "enode_devices",
  "enode_events",
  "enode_telemetry_snapshots",
  "enode_webhook_queue",
  "enode_telemetry_5m",
  "enode_telemetry_latest",
  "enode_alerts",
  "telemetry_logs",
  "telemetry_latest_state",
  "telemetry_site_summary",
  "mobile_push_tokens",
  "push_notification_events",
];

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  let ok = true;
  for (const t of tables) {
    const r = await client.query(`select to_regclass('public.${t}') as reg`);
    const exists = r.rows[0]?.reg != null;
    console.log(exists ? `✓ ${t}` : `✗ ${t} MISSING`);
    if (!exists) ok = false;
  }
  process.exit(ok ? 0 : 1);
} catch (err) {
  console.error("Check failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
