/**
 * Concatenate supabase/migrations/*.sql in sorted order for manual apply
 * via Supabase SQL Editor when local Postgres ports are blocked.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../supabase/migrations");
const outDir = join(__dirname, "sql");
const outFile = join(outDir, "all-migrations-bundled.sql");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const parts = [
  "-- ESO Energy — bundled migrations (apply in Supabase SQL Editor)",
  `-- Generated: ${new Date().toISOString()}`,
  `-- Files: ${files.length}`,
  "-- Dashboard: https://supabase.com/dashboard/project/pndsuzscjedumjhadtio/sql/new",
  "",
];

for (const file of files) {
  parts.push(`-- ── ${file} ──`);
  parts.push(readFileSync(join(migrationsDir, file), "utf8").trim());
  parts.push("");
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, parts.join("\n"), "utf8");

console.log(`Wrote ${files.length} migration(s) to:\n  ${outFile}\n`);
console.log("Apply manually:");
console.log("  1. Open https://supabase.com/dashboard/project/pndsuzscjedumjhadtio/sql/new");
console.log("  2. Paste the bundled file contents and click Run");
