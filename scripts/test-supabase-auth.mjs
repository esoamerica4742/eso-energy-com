/**
 * Test Supabase password sign-in with keys from .env
 */
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv({ force: true });

const url = process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
const email = process.argv[2];
const password = process.argv[3];

if (!url || !key) {
  console.error("Missing SUPABASE_URL or anon/publishable key");
  process.exit(1);
}

if (!email || !password) {
  console.log("Usage: node scripts/test-supabase-auth.mjs <email> <password>");
  console.log("Skipped — no credentials provided (not a failure).");
  process.exit(0);
}

const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({ email, password }),
});

const body = await res.json();
if (!res.ok) {
  console.error("✗ Sign-in failed:", body.error_description ?? body.msg ?? body);
  console.error("\nIf you see Invalid API key, replace keys with JWT anon from Supabase Dashboard → API.");
  process.exit(1);
}

console.log("✓ Sign-in works with current anon/publishable key");
console.log(`  User: ${body.user?.email ?? "unknown"}`);
