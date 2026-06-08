/**
 * Apply sites latitude/longitude columns (safe to re-run).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv({ force: true });

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../supabase/migrations/20260523120000_sites_coordinates.sql",
);

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(readFileSync(migrationPath, "utf8"));
  console.log("✓ sites.latitude / sites.longitude ready");
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
