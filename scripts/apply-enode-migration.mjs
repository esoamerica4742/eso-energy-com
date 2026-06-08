/**
 * Apply only the Enode integration migration (safe to re-run table DDL).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv({ force: true });

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../supabase/migrations/20260520120000_enode_integration.sql",
);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required in .env");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

try {
  await client.connect();
  console.log("Applying Enode migration…");
  await client.query(readFileSync(migrationPath, "utf8"));
  console.log("✓ enode_connections, enode_devices, enode_events, enode_telemetry_snapshots ready.");
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
