/**
 * Push Magic Link email template as 6-digit OTP (no ConfirmationURL).
 * Requires SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
 *
 *   node scripts/apply-email-otp-template.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectEnv } from './load-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
loadProjectEnv();

const token = (process.env.SUPABASE_ACCESS_TOKEN ?? '').trim();
const projectRef = (
  process.env.VITE_SUPABASE_PROJECT_ID ??
  process.env.SUPABASE_PROJECT_REF ??
  ''
).trim();

const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
const refFromUrl = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const ref = projectRef || refFromUrl || '';

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env');
  console.error('Create one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}
if (!ref) {
  console.error('Missing project ref (VITE_SUPABASE_PROJECT_ID or SUPABASE_URL in .env)');
  process.exit(1);
}

const templatePath = join(root, 'supabase/templates/magic-link-otp.html');
const content = readFileSync(templatePath, 'utf8');

if (content.includes('ConfirmationURL')) {
  console.error('Template must not include ConfirmationURL (that sends magic links).');
  process.exit(1);
}
if (!content.includes('{{ .Token }}')) {
  console.error('Template must include {{ .Token }} for 6-digit OTP emails.');
  process.exit(1);
}

const body = {
  mailer_subjects_magic_link: 'Your ESO Energy sign-in code',
  mailer_templates_magic_link_content: content,
};

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await res.text();
if (!res.ok) {
  console.error(`Failed (${res.status}):`, text.slice(0, 500));
  process.exit(1);
}

console.log(`OK: Magic Link template on ${ref} now sends 6-digit OTP ({{ .Token }}).`);
console.log('Test: sign in from the app with email — you should receive a code, not a link.');
