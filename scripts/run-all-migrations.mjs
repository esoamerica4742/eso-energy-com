/**
 * Apply ALL SQL migrations in order (core B2B schema + security foundation).
 * Telemetry uses 20260522003000_enterprise_telemetry_compat.sql (partitioned
 * variant archived under migrations/archive/). For legacy DBs, also run:
 *   node scripts/apply-telemetry-stack.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadProjectEnv } from "./load-env.mjs";

const presetDatabaseUrl =
  process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("YOUR_")
    ? process.env.DATABASE_URL
    : null;

loadProjectEnv({ force: true });

if (presetDatabaseUrl) {
  process.env.DATABASE_URL = presetDatabaseUrl;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../supabase/migrations");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

try {
  await client.connect();
  console.log(`Connected — applying ${files.length} migration(s)...\n`);
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`→ ${file}`);
    await client.query(sql);
    console.log(`  ✓ done\n`);
  }
  console.log("All migrations applied.");
} catch (err) {
  console.error("\nMigration failed:", err.message);
  if (err.message.includes("ENOTFOUND") || err.message.includes("timeout") || err.message.includes("ECONNREFUSED") || err.message.includes("TLS")) {
    console.error(`
Cannot connect to Postgres from this machine (network may block outbound port 5432).

Fastest fix — SQL Editor:
  npm run db:bundle
  Open https://supabase.com/dashboard/project/pndsuzscjedumjhadtio/sql/new
  Paste scripts/sql/all-migrations-bundled.sql and Run

Or retry: powershell -File scripts/push-db.ps1
`);
  }
  process.exit(1);
} finally {
  await client.end();
}
