#!/usr/bin/env node
/**
 * Build TanStack Start + deploy to Cloudflare Workers (app.eso-energy.com).
 *
 * Prereqs:
 *   npx wrangler login
 *   .env with VITE_* (build) + server secrets (see scripts/set-cf-secrets.ps1)
 *
 * Usage:
 *   node scripts/deploy-web-app.mjs
 *   node scripts/deploy-web-app.mjs --dry-run
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const wranglerConfig = resolve(root, "dist/server/wrangler.json");

function run(cmd, args, opts = {}) {
  const label = [cmd, ...args].join(" ");
  console.log(`\n> ${label}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("ESO Energy — Cloudflare Workers deploy");
console.log(`Root: ${root}`);

if (!existsSync(resolve(root, ".env"))) {
  console.warn("Warning: .env not found — VITE_* client vars may be missing from the build.");
}

run("npm", ["run", "build"]);

if (!existsSync(wranglerConfig)) {
  console.error(`Build output missing: ${wranglerConfig}`);
  console.error("Expected vite build to emit dist/server/wrangler.json");
  process.exit(1);
}

if (dryRun) {
  console.log("\nDry run — skipping wrangler deploy.");
  console.log(`Would deploy with: dist/server/wrangler.json`);
  process.exit(0);
}

run("npx", ["wrangler", "deploy", "--config", "dist/server/wrangler.json"]);

console.log("\nDeploy complete.");
console.log("  https://app.eso-energy.com/welcome");
console.log("  https://app.eso-energy.com/api/health/enterprise");
console.log("\nIf DNS is not live yet, attach eso-energy.com zone to this Cloudflare account,");
console.log("then re-run deploy or add a proxied CNAME: app -> eso-energy-app.<account>.workers.dev");
