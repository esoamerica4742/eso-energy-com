/**
 * Eso Pay production readiness probe (DB + edge + Monnify local env).
 */
import pg from 'pg';
import { loadProjectEnv } from './load-env.mjs';

loadProjectEnv({ force: true });

const url = process.env.SUPABASE_URL ?? '';
const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? '?';

const tables = [
  'companies',
  'profiles',
  'company_wallets',
  'bills',
    'utility_providers',
    'utility_purchases',
    'wallet_transactions',
  'eso_pay_funding_intents',
  'monnify_bill_payments',
];

console.log('\n=== Eso Pay Readiness ===\n');
console.log('Project:', ref);

// Edge
if (anon) {
  const base = `${url.replace(/\/$/, '')}/functions/v1/eso-pay-api`;
  for (const path of [
    '/health/monnify',
    '/wallet',
    '/wallet/reserved-account',
    '/bills',
    '/utilities/providers',
    '/utilities/recent',
    '/wallet/transactions?category=bills',
  ]) {
    const res = await fetch(`${base}${path}`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    console.log(`Edge GET ${path}: HTTP ${res.status}`);
  }
}

// Monnify local
const mKey = process.env.MONNIFY_API_KEY?.trim();
const mSec = process.env.MONNIFY_SECRET_KEY?.trim();
const mCon = process.env.MONNIFY_CONTRACT_CODE?.trim();
console.log(
  'Monnify in eso-energy-com/.env:',
  mKey && mSec && mCon ? 'keys present' : 'MISSING (run secrets set on Supabase too)',
);

// DB
if (!process.env.DATABASE_URL) {
  console.log('\nDB: skip (no DATABASE_URL)');
  process.exit(0);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('\nDatabase:');
  let schemaOk = true;
  for (const t of tables) {
    const r = await client.query(`select to_regclass('public.${t}') as reg`);
    const ok = r.rows[0]?.reg != null;
    console.log(ok ? `  ✓ ${t}` : `  ✗ ${t} MISSING`);
    if (!ok) schemaOk = false;
  }

  if (schemaOk) {
    const { rows: [stats] } = await client.query(`
      select
        (select count(*)::int from companies) as companies,
        (select count(*)::int from profiles) as profiles,
        (select count(*)::int from profiles where company_id is not null) as profiles_with_company,
        (select count(*)::int from company_wallets) as wallets,
        (select count(*)::int from company_wallets where reserved_account_number is not null) as wallets_with_nuban,
        (select count(*)::int from bills) as bills,
        (select count(*)::int from utility_providers) as utility_providers,
        (select count(*)::int from utility_purchases where status = 'success') as utility_purchases_success
    `);
    console.log('\nData:', stats);
  }
} catch (err) {
  console.error('\nDB error:', err.message);
} finally {
  await client.end();
}

console.log('');
