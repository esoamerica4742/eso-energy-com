#!/usr/bin/env node
/**
 * Test Monnify reserved-account provisioning (v2 API + sandbox BVN).
 */
import { loadProjectEnv } from './load-env.mjs';

loadProjectEnv({ force: true });

const apiKey = process.env.MONNIFY_API_KEY?.trim();
const secretKey = process.env.MONNIFY_SECRET_KEY?.trim();
const contractCode = process.env.MONNIFY_CONTRACT_CODE?.trim();
const sandboxBvn = process.env.MONNIFY_SANDBOX_BVN?.trim();
const env = (process.env.MONNIFY_ENV ?? 'sandbox').toLowerCase();
const baseUrl =
  process.env.MONNIFY_BASE_URL?.trim() ||
  (env === 'live' || env === 'production'
    ? 'https://api.monnify.com'
    : 'https://sandbox.monnify.com');

if (!apiKey || !secretKey || !contractCode) {
  console.error('Set MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE in .env');
  process.exit(1);
}

if (!sandboxBvn) {
  console.error(
    'Set MONNIFY_SANDBOX_BVN in .env (11-digit test BVN, e.g. 22222222222) then push to Supabase secrets.',
  );
  process.exit(1);
}

const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
  method: 'POST',
  headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
});
const loginJson = await loginRes.json();
if (!loginRes.ok || !loginJson.requestSuccessful) {
  console.error('Monnify auth FAILED:', loginJson.responseMessage ?? loginRes.status);
  process.exit(1);
}

const token = loginJson.responseBody.accessToken;
const accountReference = `eso-probe-${Date.now()}`;

const body = {
  accountReference,
  accountName: 'ESO Pay Probe',
  customerName: 'ESO Probe User',
  customerEmail: 'probe@eso-energy.test',
  currencyCode: 'NGN',
  contractCode,
  bvn: sandboxBvn,
  getAllAvailableBanks: true,
};

console.log('Creating reserved account (v2)...');
const res = await fetch(`${baseUrl}/api/v2/bank-transfer/reserved-accounts`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const json = await res.json();
if (!res.ok || !json.requestSuccessful) {
  console.error('Reserved account FAILED:', json.responseMessage ?? res.status);
  console.error('Response code:', json.responseCode ?? 'n/a');
  process.exit(1);
}

const acct = json.responseBody?.accounts?.[0];
console.log('\nReserved account: OK');
console.log('  Reference:', json.responseBody?.accountReference);
console.log('  Bank:', acct?.bankName);
console.log('  Number:', acct?.accountNumber);
