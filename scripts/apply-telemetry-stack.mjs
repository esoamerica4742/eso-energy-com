/**
 * Applies telemetry prerequisite + enterprise telemetry migrations in order.
 * Safe to re-run.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv({ force: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required in .env");
  process.exit(1);
}

const baseDir = join(dirname(fileURLToPath(import.meta.url)), "../supabase/migrations");
const files = [
  "20260522001000_sites_telemetry_prereq.sql",
  "20260522003000_enterprise_telemetry_compat.sql",
  "20260521162000_mobile_push_notifications.sql",
];

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
});

try {
  await client.connect();
  for (const file of files) {
    console.log(`Applying ${file}...`);
    const sql = readFileSync(join(baseDir, file), "utf8");
    await client.query(sql);
    console.log(`✓ ${file}`);
  }
  await client.query("NOTIFY pgrst, 'reload schema';");
  console.log("✓ Reloaded PostgREST schema cache");
} catch (error) {
  console.error("Failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  await client.end();
}
