-- =========================================================
-- ESO ENERGY — Security foundation schema
-- TOTP secrets stored as AES-256-GCM blobs (application layer).
-- Service-role server only — no client direct access to sensitive cols.
-- =========================================================

-- Role enum for RBAC (Layer 2)
do $$ begin
  create type public.user_role as enum (
    'SUPER_ADMIN',
    'ORG_ADMIN',
    'SITE_MANAGER',
    'ANALYST',
    'VIEWER'
  );
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists role public.user_role not null default 'VIEWER';

-- ---------------------------------------------------------
-- user_security_settings — TOTP, backup codes, lockout state
-- totp_secret_encrypted: base64url packed blob from Web Crypto AES-256-GCM
-- totp_key_version: which ENCRYPTION_MASTER_KEY_* encrypted this row
-- ---------------------------------------------------------
create table if not exists public.user_security_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  totp_secret_encrypted text,
  totp_key_version smallint not null default 1,
  totp_enabled boolean not null default false,
  totp_verified_at timestamptz,
  backup_code_hashes text[] default '{}',
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  passkey_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.user_security_settings.totp_secret_encrypted is
  'AES-256-GCM packed blob (base64url). Plaintext TOTP never stored.';
comment on column public.user_security_settings.totp_key_version is
  'Maps to ENCRYPTION_MASTER_KEY (1) or ENCRYPTION_MASTER_KEY_V2 (2) in CF Secrets.';

-- ---------------------------------------------------------
-- app_sessions — refresh token families, fingerprinting, max 3 concurrent
-- ---------------------------------------------------------
create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  refresh_token_hash text not null,
  token_family uuid not null default gen_random_uuid(),
  session_fingerprint text not null,
  ip_address inet,
  user_agent text,
  country text,
  device_label text,
  last_active_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_sessions_user_active_idx
  on public.app_sessions(user_id, last_active_at desc)
  where revoked_at is null;

-- ---------------------------------------------------------
-- passkeys (WebAuthn credentials)
-- ---------------------------------------------------------
create table if not exists public.passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_name text not null default 'Unknown device',
  transports text[],
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists passkeys_user_idx on public.passkeys(user_id);

-- ---------------------------------------------------------
-- magic_link_tokens — one-time, 10 min expiry, rate-limited at API layer
-- ---------------------------------------------------------
create table if not exists public.magic_link_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists magic_link_tokens_email_idx on public.magic_link_tokens(email, created_at desc);

-- ---------------------------------------------------------
-- api_keys — SHA-256 hash only, prefix for display
-- ---------------------------------------------------------
do $$ begin
  create type public.api_key_scope as enum ('read_only', 'read_write', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scope public.api_key_scope not null default 'read_only',
  expires_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists api_keys_org_idx on public.api_keys(org_id);

-- ---------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------
create table if not exists public.audit_logs (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete set null,
  org_id uuid references public.companies(id) on delete set null,
  action text not null,
  resource text,
  ip_address text not null,
  user_agent text not null,
  country text,
  success boolean not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_user_created_idx on public.audit_logs(user_id, created_at desc);
create index if not exists audit_logs_org_created_idx on public.audit_logs(org_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs(action, created_at desc);

-- ---------------------------------------------------------
-- consent_tracking (GDPR / NDPR / POPIA)
-- ---------------------------------------------------------
create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address text
);

-- ---------------------------------------------------------
-- org security settings (IP allowlist, business hours, geo)
-- ---------------------------------------------------------
create table if not exists public.org_security_settings (
  org_id uuid primary key references public.companies(id) on delete cascade,
  ip_allowlist_cidr text[] default '{}',
  allowed_countries text[] default '{}',
  analyst_business_hours_only boolean not null default false,
  business_hours_start time default '08:00',
  business_hours_end time default '18:00',
  business_hours_tz text default 'Africa/Lagos',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- RLS: deny all client access to sensitive security tables
-- WHY: Only service-role server handlers may read/write TOTP blobs.
-- ---------------------------------------------------------
alter table public.user_security_settings enable row level security;
alter table public.app_sessions enable row level security;
alter table public.passkeys enable row level security;
alter table public.magic_link_tokens enable row level security;
alter table public.api_keys enable row level security;
alter table public.audit_logs enable row level security;

-- Users may read their own non-sensitive session list via security definer view (future).
-- For now: no policies = authenticated users blocked; service role bypasses RLS.

-- Users can read their own passkey metadata (device names only) — via API, not direct for now.

-- Auto-provision security row on signup
create or replace function public.handle_new_user_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_security_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_security on auth.users;
create trigger on_auth_user_security
  after insert on auth.users
  for each row execute function public.handle_new_user_security();

-- Backfill existing users
insert into public.user_security_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;
