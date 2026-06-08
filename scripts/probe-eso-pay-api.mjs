#!/usr/bin/env node
/**
 * End-to-end smoke test for deployed eso-pay-api (creates ephemeral test user).
 */
import { createClient } from '@supabase/supabase-js';
import { loadProjectEnv } from './load-env.mjs';

loadProjectEnv({ force: true });

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiBase =
  process.env.ESO_PAY_API_BASE_URL ??
  `${url}/functions/v1/eso-pay-api`;

if (!url || !anonKey || !serviceKey) {
  console.error('Missing SUPABASE_URL, anon key, or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const testEmail = `esopay-smoke-${Date.now()}@eso-energy.test`;
const testPassword = 'EsoPaySmoke2026!';

let ok = true;
const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(pass ? `  ✓ ${name}` : `  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  if (!pass) ok = false;
}

async function api(path, token, userId, options = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      'X-Eso-Pay-User-Id': userId,
      'X-Company-Id': userId,
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

console.log('\n=== Eso Pay API Smoke Test ===\n');
console.log('BFF:', apiBase);

console.log('\nSetup: ephemeral test user');
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: testEmail,
  password: testPassword,
  email_confirm: true,
});
if (createErr || !created.user) {
  console.error('Could not create test user:', createErr?.message ?? 'unknown');
  process.exit(1);
}
const userId = created.user.id;

const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
  email: testEmail,
  password: testPassword,
});
if (signInErr || !signIn.session?.access_token) {
  console.error('Could not sign in test user:', signInErr?.message ?? 'no session');
  await admin.auth.admin.deleteUser(userId);
  process.exit(1);
}
const token = signIn.session.access_token;
console.log('  User:', testEmail);

console.log('\nHealth & wallet');
{
  const { status, body } = await api('/health/monnify', token, userId);
  record('GET /health/monnify', status === 200 && body?.ok === true, `HTTP ${status}`);
}
{
  const { status, body } = await api('/wallet', token, userId);
  record('GET /wallet', status === 200 && typeof body?.balance_kobo === 'number', `HTTP ${status}`);
}
{
  const { status, body } = await api('/wallet/transactions?page=1&limit=5', token, userId);
  record(
    'GET /wallet/transactions',
    status === 200 && Array.isArray(body?.data),
    `HTTP ${status}`,
  );
}
{
  const { status, body } = await api('/wallet/transactions?category=airtime&limit=5', token, userId);
  record(
    'GET /wallet/transactions?category=airtime',
    status === 200 && Array.isArray(body?.data),
    `HTTP ${status}`,
  );
}

console.log('\nBillers & recent');
{
  const { status, body } = await api('/utilities/providers', token, userId);
  const count = Array.isArray(body) ? body.length : Array.isArray(body?.data) ? body.data.length : 0;
  record('GET /utilities/providers', status === 200 && count >= 5, `HTTP ${status}, count=${count}`);
}
{
  const { status, body } = await api('/utilities/recent?limit=8', token, userId);
  record(
    'GET /utilities/recent',
    status === 200 && Array.isArray(body?.data),
    `HTTP ${status}, rows=${body?.data?.length ?? 0}`,
  );
}
{
  const { status, body } = await api('/power-shield', token, userId);
  record('GET /power-shield', status === 200 && Array.isArray(body?.meters), `HTTP ${status}`);
}

console.log('\nReserved account (may provision sandbox NUBAN)');
{
  const { status, body } = await api('/wallet/reserved-account', token, userId);
  const provisioned = status === 200 && Boolean(body?.account_number);
  const monnifyMissing = body?.code === 'MONNIFY_NOT_CONFIGURED';
  record(
    'GET /wallet/reserved-account',
    provisioned || monnifyMissing || status === 503,
    provisioned
      ? `NUBAN ${body.account_number}`
      : monnifyMissing
        ? 'Monnify secrets not on edge — run npm run secrets:monnify'
        : `HTTP ${status} ${body?.code ?? ''}`,
  );
}

console.log('\nCleanup');
await admin.auth.admin.deleteUser(userId);
console.log('  Deleted ephemeral test user');

console.log('\n--- Summary ---');
for (const row of results) {
  console.log(`${row.pass ? 'PASS' : 'FAIL'}  ${row.name}${row.detail ? ` (${row.detail})` : ''}`);
}
console.log(ok ? '\nAll smoke checks passed.\n' : '\nSome checks failed — review above.\n');
process.exit(ok ? 0 : 1);
