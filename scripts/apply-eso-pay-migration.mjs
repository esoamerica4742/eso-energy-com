#!/usr/bin/env node
/**
 * Apply Eso Pay / Monnify migrations via DATABASE_URL (skips broken `db push` replays).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadProjectEnv } from './load-env.mjs';

loadProjectEnv({ force: true });

function resolveDatabaseUrl() {
  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const ref = process.env.SUPABASE_PROJECT_REF?.trim() || 'pndsuzscjedumjhadtio';

  // Prefer pooler built from password — legacy db.<ref>.supabase.co direct hosts often fail DNS.
  if (password) {
    const encoded = encodeURIComponent(password);
    const region = process.env.SUPABASE_POOLER_REGION?.trim() || 'aws-1-eu-west-2';
    return `postgresql://postgres.${ref}:${encoded}@${region}.pooler.supabase.com:5432/postgres`;
  }

  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return null;
  if (/db\.[a-z0-9]+\.supabase\.co/i.test(raw)) {
    console.warn(
      'Warning: DATABASE_URL uses deprecated db.<ref>.supabase.co — set SUPABASE_DB_PASSWORD for pooler instead.',
    );
  }
  return raw;
}

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) {
  console.error(
    'Set DATABASE_URL or SUPABASE_DB_PASSWORD in eso-energy-com/.env (Dashboard -> Settings -> Database).',
  );
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const migrationFiles = [
  'supabase/migrations/20260528120000_payments_monnify.sql',
  'supabase/migrations/20260529130000_eso_pay_individual_wallets.sql',
  'supabase/migrations/20260530120000_power_shield.sql',
  'supabase/migrations/20260530143000_power_shield_feedback.sql',
  'supabase/migrations/20260530150000_power_shield_scheduled_alerts.sql',
  'supabase/migrations/20260531130000_power_shield_capacity_engine.sql',
  'supabase/migrations/20260601120000_utility_pending_fulfillment.sql',
  'supabase/migrations/20260602140000_eso_pay_wallet_threshold_webhooks.sql',
  'supabase/migrations/20260602150000_volume_threshold_engine.sql',
  'supabase/migrations/20260602160000_vtpass_utility_distribution.sql',
  'supabase/migrations/20260602170000_utility_purchases_insufficient_funds_status.sql',
  'supabase/migrations/20260607120000_drop_vtpass_columns.sql',
];

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('Connected to Supabase Postgres.');
try {
  for (const relativePath of migrationFiles) {
    const sqlPath = join(root, relativePath);
    const sql = readFileSync(sqlPath, 'utf8');
    console.log('Applying:', relativePath);
    await client.query(sql);
    console.log('OK:', relativePath);
  }
  console.log('Eso Pay migrations applied.');
} catch (err) {
  if (err.code === 'ECONNREFUSED' || err.code === '28P01' || /password authentication failed/i.test(err.message)) {
    console.error('Database connection failed — set SUPABASE_DB_PASSWORD or DATABASE_URL in .env');
  }
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
