/**
 * End-to-end probe: Supabase JWT → enode-api edge → Enode OAuth/link/sync/telemetry.
 * Creates a temporary user, runs probes, cleans up.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadProjectEnv } from "./load-env.mjs";

loadProjectEnv({ force: true });

function loadMobileAnonKey() {
  const mobileEnv = join(dirname(fileURLToPath(import.meta.url)), "../../eso-energy-mobile/.env");
  if (!existsSync(mobileEnv)) return null;
  const text = readFileSync(mobileEnv, "utf8");
  const match =
    text.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1] ??
    text.match(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+)/)?.[1];
  return match?.trim().replace(/^["']|["']$/g, "") ?? null;
}

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_ANON_KEY,
  ENODE_CLIENT_ID,
  ENODE_CLIENT_SECRET,
  ENODE_ENV,
} = process.env;

const anonKey = SUPABASE_ANON_KEY ?? SUPABASE_PUBLISHABLE_KEY;
const signInKey = (() => {
  const mobile = loadMobileAnonKey();
  if (mobile?.startsWith("eyJ")) return mobile;
  if (anonKey?.startsWith("eyJ")) return anonKey;
  return anonKey;
})();
const DEMO_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const edgeBase = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/enode-api`;

let passed = 0;
let failed = 0;
let warned = 0;
let userId = null;
const testEmail = `enode.probe.${Date.now()}@example.com`;
const testPassword = `Probe-${crypto.randomUUID().slice(0, 12)}!Aa`;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  passed++;
}

function fail(msg, detail) {
  console.error(`  ✗ ${msg}`);
  if (detail) console.error(`    ${detail}`);
  failed++;
}

function warn(msg, detail) {
  console.log(`  ⚠ ${msg}`);
  if (detail) console.log(`    ${detail}`);
  warned++;
}

async function enodeOAuthToken() {
  const env = ENODE_ENV ?? "sandbox";
  const oauthBase =
    env === "production"
      ? "https://oauth.production.enode.io"
      : "https://oauth.sandbox.enode.io";
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const res = await fetch(`${oauthBase}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${ENODE_CLIENT_ID}:${ENODE_CLIENT_SECRET}`).toString("base64")}`,
    },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`OAuth ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

async function callEdge(path, { method = "GET", token, body } = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    apikey: signInKey,
    "Content-Type": "application/json",
  };
  const res = await fetch(`${edgeBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

console.log("\n=== Enode Link/Sync Flow Probe ===\n");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !anonKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

try {
  console.log("1) Enode OAuth (server credentials)");
  if (!ENODE_CLIENT_ID || !ENODE_CLIENT_SECRET) {
    fail("Enode credentials missing in .env");
  } else {
    try {
      const token = await enodeOAuthToken();
      pass(`Enode OAuth OK (${ENODE_ENV ?? "sandbox"}, token ${token.slice(0, 8)}…)`);
    } catch (err) {
      fail("Enode OAuth failed", err.message);
    }
  }

  console.log("\n2) Create probe user + company link");
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    fail("Could not create probe user", createErr?.message);
    process.exit(1);
  }
  userId = created.user.id;
  pass(`Probe user created (${testEmail})`);

  await admin.from("profiles").upsert({
    id: userId,
    email: testEmail,
    company_id: DEMO_COMPANY_ID,
    updated_at: new Date().toISOString(),
  });
  pass(`Linked to company ${DEMO_COMPANY_ID}`);

  console.log("\n3) Sign in (user JWT for edge auth)");
  const anon = createClient(SUPABASE_URL, signInKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: session, error: signErr } = await anon.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (signErr || !session.session?.access_token) {
    fail("Sign-in failed", signErr?.message ?? "no access_token");
    if (!signInKey?.startsWith("eyJ")) {
      warn("Edge + mobile auth need JWT anon key (eyJ…) — sb_publishable_* breaks password sign-in");
    }
    throw new Error("jwt_unavailable");
  }
  const jwt = session.session.access_token;
  pass("JWT obtained");

  console.log("\n4) enode-api edge (authenticated)");
  const probes = [
    { name: "GET /connection", path: "/connection" },
    { name: "GET /devices", path: "/devices" },
    { name: "GET /telemetry/latest", path: "/telemetry/latest" },
  ];

  let deviceId = null;
  for (const p of probes) {
    const { status, json } = await callEdge(p.path, { token: jwt });
    if (status >= 200 && status < 300) {
      pass(`${p.name} → ${status}`);
      if (p.path === "/devices" && Array.isArray(json.devices) && json.devices.length) {
        deviceId = json.devices[0].id;
        pass(`  devices: ${json.devices.length} (first: ${json.devices[0].display_name ?? json.devices[0].enode_device_id})`);
      }
      if (p.path === "/connection" && json.link_status) {
        pass(`  link_status: ${json.link_status}`);
      }
    } else {
      fail(`${p.name} → ${status}`, JSON.stringify(json).slice(0, 180));
    }
  }

  const { data: siteRow } = await admin
    .from("sites")
    .select("id")
    .eq("company_id", DEMO_COMPANY_ID)
    .limit(1)
    .maybeSingle();
  if (siteRow?.id) {
    const { status, json } = await callEdge(
      `/telemetry/site-summary?siteId=${siteRow.id}`,
      { token: jwt },
    );
    if (status >= 200 && status < 300) {
      pass(`GET /telemetry/site-summary → ${status}`);
    } else {
      warn(`GET /telemetry/site-summary → ${status}`, JSON.stringify(json).slice(0, 120));
    }
  } else {
    warn("No site row — skipped /telemetry/site-summary (needs siteId)");
  }

  console.log("\n5) POST /link (Enode link session)");
  const { status: linkStatus, json: linkJson } = await callEdge("/link", {
    method: "POST",
    token: jwt,
    body: { redirectUri: "esoenergymobile://link-device/callback", vendorType: "inverter" },
  });
  if (linkStatus >= 200 && linkStatus < 300 && linkJson.linkUrl) {
    pass(`Link session created (${linkStatus})`);
    pass(`  linkUrl host: ${new URL(linkJson.linkUrl).host}`);
  } else {
    fail(`POST /link → ${linkStatus}`, JSON.stringify(linkJson).slice(0, 220));
  }

  console.log("\n6) POST /sync (pull from Enode → DB)");
  const { status: syncStatus, json: syncJson } = await callEdge("/sync", {
    method: "POST",
    token: jwt,
  });
  if (syncStatus >= 200 && syncStatus < 300) {
    pass(`Sync OK → synced: ${syncJson.synced ?? 0} device(s)`);
  } else {
    warn(`POST /sync → ${syncStatus}`, JSON.stringify(syncJson).slice(0, 220));
  }

  if (deviceId) {
    console.log("\n7) Device detail + telemetry");
    const { status: devStatus, json: devJson } = await callEdge(`/devices/${deviceId}`, {
      token: jwt,
    });
    if (devStatus >= 200 && devStatus < 300) {
      pass(`GET /devices/${deviceId.slice(0, 8)}… → ${devStatus}`);
    } else {
      fail(`GET /devices/:id → ${devStatus}`, JSON.stringify(devJson).slice(0, 180));
    }

    const { status: telStatus, json: telJson } = await callEdge(
      `/telemetry/${deviceId}?limit=5`,
      { token: jwt },
    );
    if (telStatus >= 200 && telStatus < 300) {
      const count = Array.isArray(telJson.points)
        ? telJson.points.length
        : Array.isArray(telJson.snapshots)
          ? telJson.snapshots.length
          : 0;
      pass(`GET /telemetry/:id → ${telStatus} (${count} point(s))`);
    } else {
      warn(`GET /telemetry/:id → ${telStatus}`, JSON.stringify(telJson).slice(0, 180));
    }
  } else {
    warn("No devices in DB — skipped device/telemetry detail probes");
  }

  console.log("\n8) DB state check");
  const { data: conn } = await admin
    .from("enode_connections")
    .select("link_status, enode_user_id, last_link_url")
    .eq("company_id", DEMO_COMPANY_ID)
    .maybeSingle();
  if (conn) {
    pass(`enode_connections: ${conn.link_status} (${conn.enode_user_id})`);
  } else {
    fail("enode_connections row missing for demo company");
  }

  const { count: deviceCount } = await admin
    .from("enode_devices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", DEMO_COMPANY_ID);
  pass(`enode_devices for company: ${deviceCount ?? 0}`);
} catch (err) {
  if (err?.message !== "jwt_unavailable") {
    fail("Unexpected probe error", err instanceof Error ? err.message : String(err));
  }
} finally {
  if (userId) {
    console.log("\nCleaning up probe user…");
    await admin.auth.admin.deleteUser(userId);
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed, ${warned} warnings ===\n`);
process.exit(failed > 0 ? 1 : 0);
