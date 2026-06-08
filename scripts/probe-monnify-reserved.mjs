/**
 * Test Monnify reserved-account create (same as eso-pay-api wallet provisioning).
 *   node scripts/probe-monnify-reserved.mjs
 */
import { loadProjectEnv } from './load-env.mjs';

loadProjectEnv({ force: true });

const companyId = process.argv[2] ?? '00000000-0000-4000-8000-000000000001';
const accountReference = `eso-${companyId}`;
const baseUrl =
  process.env.MONNIFY_BASE_URL?.trim() ||
  (process.env.MONNIFY_ENV === 'live' ? 'https://api.monnify.com' : 'https://sandbox.monnify.com');

const apiKey = process.env.MONNIFY_API_KEY?.trim();
const secretKey = process.env.MONNIFY_SECRET_KEY?.trim();
const contractCode = process.env.MONNIFY_CONTRACT_CODE?.trim();

if (!apiKey || !secretKey || !contractCode) {
  console.error('Missing MONNIFY_* in eso-energy-com/.env');
  process.exit(1);
}

const basic = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
  method: 'POST',
  headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
});
const loginJson = await loginRes.json();
if (!loginJson.requestSuccessful) {
  console.error('Login failed:', loginJson.responseMessage);
  process.exit(1);
}
const token = loginJson.responseBody.accessToken;

const body = {
  accountReference,
  accountName: 'ESO Pay — ESO Energy',
  customerName: 'Pauline',
  customerEmail: 'pauline464544@gmail.com',
  currencyCode: 'NGN',
  contractCode,
  getAllAvailableBanks: false,
};

const res = await fetch(`${baseUrl}/api/v1/bank-transfer/reserved-accounts`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const json = await res.json();
console.log('Reference:', accountReference);
console.log('HTTP:', res.status);
console.log('Success:', json.requestSuccessful);
console.log('Message:', json.responseMessage);
if (json.responseBody?.accounts?.[0]) {
  const a = json.responseBody.accounts[0];
  console.log('NUBAN:', a.accountNumber, '|', a.bankName, '|', a.accountName);
} else {
  console.log('Body:', JSON.stringify(json.responseBody ?? json, null, 2));
}
