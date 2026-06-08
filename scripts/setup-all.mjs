/**
 * One-shot local setup: Enode DB, tenant bootstrap, env secrets, checks, optional edge deploy.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function run(label, cmd, args) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`✗ ${label} failed (exit ${r.status})`);
    return false;
  }
  return true;
}

console.log("=== ESO Energy — full setup ===\n");

run("Enode DB migration", "npm", ["run", "db:migrate:enode"]);
run("Generate Enode webhook secret", "node", ["scripts/setup-enode-env.mjs"]);
run("Bootstrap company + profiles", "node", ["scripts/bootstrap-tenant.mjs"]);
run("Verify Enode tables", "node", ["scripts/check-enode-db.mjs"]);
run("Backend env check", "npm", ["run", "verify:backend"]);

console.log("\n▶ Supabase CLI edge deploy (optional)");
const supabase = spawnSync("npx", ["supabase@latest", "--version"], {
  cwd: root,
  encoding: "utf8",
  shell: true,
});
if (supabase.status === 0) {
  console.log("  Supabase CLI available via npx");
  console.log("  Run manually after `npx supabase login`:");
  console.log("    npx supabase link --project-ref ssmcnzsvrcxfbgufvoed");
  console.log("    npx supabase secrets set --env-file .env");
  console.log("    npx supabase functions deploy enode-webhook --no-verify-jwt");
  console.log("    npx supabase functions deploy enode-api");
} else {
  console.log("  Using web BFF at /api/enode (no CLI deploy required for local dev)");
}

console.log(`
=== Done ===

Web BFF (works without edge deploy):
  npm run dev  →  http://10.110.187.192:5178/api/enode

Mobile .env — for device on same Wi‑Fi, set:
  EXPO_PUBLIC_ENODE_API_URL=http://10.110.187.192:5178/api/enode

Enode Link (after adding CLIENT_ID + SECRET in .env):
  Webhook URL: https://ssmcnzsvrcxfbgufvoed.supabase.co/functions/v1/enode-webhook
  Or local tunnel: https://YOUR_NGROK/api/enode/webhook

Test sign-in:
  node scripts/test-supabase-auth.mjs your@email.com yourpassword
`);
