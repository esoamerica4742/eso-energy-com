/**
 * Quick backend readiness check — .env vars + Supabase tables + encryption tests.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const envPath = join(dirname(fileURLToPath(import.meta.url)), "../.env");
const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "ENCRYPTION_MASTER_KEY",
  "AUTH_SECRET",
  "AUTH_URL",
  "DATABASE_URL",
  "TOTP_ISSUER",
];

console.log("\n=== Backend Readiness Check ===\n");

let ok = true;
const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

for (const key of required) {
  const val = env[key];
  const valid = !!val && val.length > 0;
  console.log(valid ? `  ✓ ${key}` : `  ✗ ${key} MISSING`);
  if (!valid) ok = false;
}

if (env.ENCRYPTION_MASTER_KEY && env.ENCRYPTION_MASTER_KEY.length !== 64) {
  console.log("  ✗ ENCRYPTION_MASTER_KEY must be 64 hex chars");
  ok = false;
}

if (env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SERVICE_ROLE_KEY.startsWith("eyJ")) {
  console.log("  ⚠ SUPABASE_SERVICE_ROLE_KEY may be malformed");
  ok = false;
}

console.log("\nRun: npm run verify:tables && npm run test:totp-e2e\n");
process.exit(ok ? 0 : 1);
