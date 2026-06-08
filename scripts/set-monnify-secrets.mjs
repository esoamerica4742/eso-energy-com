#!/usr/bin/env node
/**
 * Push only Monnify edge secrets (never uploads the whole .env).
 * Requires SUPABASE_ACCESS_TOKEN in .env or `npx supabase login` first.
 */
import { spawnSync } from 'node:child_process';
import { loadProjectEnv } from './load-env.mjs';

loadProjectEnv({ force: true });

const required = ['MONNIFY_ENV', 'MONNIFY_API_KEY', 'MONNIFY_SECRET_KEY', 'MONNIFY_CONTRACT_CODE'];
const optional = [
  'MONNIFY_BASE_URL',
  'MONNIFY_SANDBOX_BVN',
  'MONNIFY_SANDBOX_NIN',
  'MONNIFY_DEFAULT_BILLER_CODE',
  'MONNIFY_DEFAULT_PRODUCT_CODE',
];

const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(', ')}`);
  process.exit(1);
}

const pairs = [...required, ...optional]
  .filter((key) => process.env[key]?.trim())
  .map((key) => `${key}=${process.env[key].trim()}`);

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim() || 'pndsuzscjedumjhadtio';

if (!process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.log(
    'Tip: add SUPABASE_ACCESS_TOKEN to .env from https://supabase.com/dashboard/account/tokens',
  );
  console.log('Or run: npx supabase login');
}

const result = spawnSync(
  'npx',
  ['supabase@latest', 'secrets', 'set', ...pairs, '--project-ref', projectRef],
  { stdio: 'inherit', shell: true, env: process.env },
);

process.exit(result.status ?? 1);
