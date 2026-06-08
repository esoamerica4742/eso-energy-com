/**
 * Verify Enode tables exist in Supabase Postgres.
 */
import pg from "pg";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv({ force: true });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const tables = [
  "enode_connections",
  "enode_devices",
  "enode_events",
  "enode_telemetry_snapshots",
];

try {
  await client.connect();
  for (const t of tables) {
    const r = await client.query(
      `select to_regclass('public.${t}') as reg`,
    );
    const ok = r.rows[0]?.reg != null;
    console.log(ok ? `✓ ${t}` : `✗ ${t} MISSING`);
    if (!ok) process.exitCode = 1;
  }
} catch (err) {
  console.error("Check failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
