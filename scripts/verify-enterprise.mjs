/**
 * Enterprise verification script:
 * 1) Validates backend .env essentials.
 * 2) Optionally probes /api/health/enterprise endpoint.
 *
 * Usage:
 *   node scripts/verify-enterprise.mjs
 *   node scripts/verify-enterprise.mjs --url http://localhost:3000
 *   node scripts/verify-enterprise.mjs --local-only
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");
const envPath = join(repoRoot, ".env");
const argv = process.argv.slice(2);
const args = new Set(argv);

function readUrlArg() {
  const eqArg = argv.find((a) => a.startsWith("--url="));
  if (eqArg) return eqArg.slice("--url=".length);
  const idx = argv.findIndex((a) => a === "--url");
  if (idx >= 0) return argv[idx + 1];
  return undefined;
}

const localOnly = args.has("--local-only");

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

const optionalEnode = [
  "ENODE_CLIENT_ID",
  "ENODE_CLIENT_SECRET",
  "ENODE_WEBHOOK_SECRET",
];

function parseDotenv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  return false;
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  return true;
}

function buildHealthEndpoint(url) {
  const trimmed = url.replace(/\/$/, "");
  // If someone passes the Enode edge function base URL, strip it back to host.
  const normalized = trimmed.replace(/\/functions\/v1\/enode-api$/i, "");
  if (/\/api\/health\/enterprise(\?|$)/i.test(normalized)) {
    return normalized.includes("?") ? normalized : `${normalized}?probe=enode`;
  }
  return `${normalized}/api/health/enterprise?probe=enode`;
}

async function run() {
  console.log("\n=== Enterprise Verification ===\n");

  const env = parseDotenv(envPath);
  const baseUrl =
    readUrlArg() ||
    process.env.ENTERPRISE_HEALTH_URL ||
    env.ENTERPRISE_HEALTH_URL ||
    env.AUTH_URL ||
    "http://localhost:3000";
  let ok = true;

  console.log("1) Local env validation");
  for (const key of required) {
    const valid = !!env[key];
    ok = valid ? pass(key) && ok : fail(`${key} missing`) && ok;
  }

  if (env.ENCRYPTION_MASTER_KEY && env.ENCRYPTION_MASTER_KEY.length !== 64) {
    ok = fail("ENCRYPTION_MASTER_KEY must be 64 hex chars") && ok;
  } else if (env.ENCRYPTION_MASTER_KEY) {
    pass("ENCRYPTION_MASTER_KEY length is valid");
  }

  const enodeConfigured = optionalEnode.every((k) => !!env[k]);
  if (enodeConfigured) {
    pass("Enode env variables configured");
  } else {
    console.log("  ⚠ Enode env variables incomplete (optional for local-only mode)");
  }

  if (localOnly) {
    console.log("\nLocal-only mode complete.");
    process.exit(ok ? 0 : 1);
  }

  console.log("\n2) Runtime health endpoint probe");
  const endpoint = buildHealthEndpoint(baseUrl);
  console.log(`  → ${endpoint}`);

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json" },
    });
    const payload = await res.json();
    const hasExpectedSchema =
      payload &&
      typeof payload === "object" &&
      typeof payload.overall === "string" &&
      payload.checks &&
      typeof payload.checks === "object";
    if (!hasExpectedSchema) {
      ok = fail(
        "Runtime endpoint responded, but not with enterprise health schema. Use your app backend URL (not a generic site or wrong function path).",
      ) && ok;
      console.log(`  Received keys: ${Object.keys(payload ?? {}).join(", ") || "(none)"}`);
      console.log("\nDone.\n");
      process.exit(ok ? 0 : 1);
    }
    const runtimeOk = payload.overall !== "fail";
    if (runtimeOk) {
      pass(`Health overall=${payload.overall}`);
    } else {
      ok = fail(`Health overall=${payload.overall}`) && ok;
    }
    if (payload.checks) {
      for (const [name, check] of Object.entries(payload.checks)) {
        const prefix = check.status === "pass" ? "✓" : check.status === "warn" ? "⚠" : "✗";
        console.log(`  ${prefix} ${name}: ${check.message}`);
      }
    }
  } catch (error) {
    ok =
      fail(
        `Failed to reach health endpoint. Start server and retry. Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ) && ok;
  }

  console.log("\nDone.\n");
  process.exit(ok ? 0 : 1);
}

void run();
