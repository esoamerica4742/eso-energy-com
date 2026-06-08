-- ESO Energy — bundled migrations (apply in Supabase SQL Editor)
-- Generated: 2026-05-28T23:18:39.666Z
-- Files: 14
-- Dashboard: https://supabase.com/dashboard/project/pndsuzscjedumjhadtio/sql/new

-- ── 20260514014114_440d38aa-b96a-4c3d-8306-5a0146799b22.sql ──
-- =========================================================
-- B2B core schema: companies, profiles, branches,
-- energy_metrics, diesel_logs with tenant-isolation RLS.
-- =========================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  location_state text,
  status text not null default 'online',
  created_at timestamptz not null default now()
);
create index if not exists branches_company_idx on public.branches(company_id);

create table if not exists public.energy_metrics (
  id bigserial primary key,
  branch_id uuid not null references public.branches(id) on delete cascade,
  solar_generation_kw numeric(10,2) not null default 0,
  load_consumption_kw numeric(10,2) not null default 0,
  battery_percentage integer not null default 0,
  battery_temperature_c numeric(5,2) not null default 0,
  grid_status text not null default 'online',
  diesel_saved_naira numeric(14,2) not null default 0,
  logged_at timestamptz not null default now()
);
create index if not exists energy_metrics_branch_logged_idx
  on public.energy_metrics(branch_id, logged_at desc);

create table if not exists public.diesel_logs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  runtime_hours numeric(8,2) not null default 0,
  expected_liters numeric(10,2) not null default 0,
  invoiced_liters numeric(10,2) not null default 0,
  invoiced_naira numeric(14,2) not null default 0,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists diesel_logs_branch_logged_idx
  on public.diesel_logs(branch_id, logged_at desc);

-- ---------------------------------------------------------
-- Security definer helper: company id of the current user.
-- ---------------------------------------------------------
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------
alter table public.companies      enable row level security;
alter table public.profiles       enable row level security;
alter table public.branches       enable row level security;
alter table public.energy_metrics enable row level security;
alter table public.diesel_logs    enable row level security;

-- ---------------------------------------------------------
-- Policies: companies
-- ---------------------------------------------------------
create policy "Members view own company"
  on public.companies for select
  to authenticated
  using (id = public.current_company_id());

create policy "Authenticated users create companies"
  on public.companies for insert
  to authenticated
  with check (true);

create policy "Members update own company"
  on public.companies for update
  to authenticated
  using (id = public.current_company_id())
  with check (id = public.current_company_id());

-- ---------------------------------------------------------
-- Policies: profiles  (own row + same-company visibility)
-- ---------------------------------------------------------
create policy "Users view own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Users view profiles in same company"
  on public.profiles for select
  to authenticated
  using (company_id is not null and company_id = public.current_company_id());

create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------
-- Policies: branches / energy_metrics / diesel_logs
-- All scoped to the caller's company.
-- ---------------------------------------------------------
create policy "Company members read branches"
  on public.branches for select to authenticated
  using (company_id = public.current_company_id());
create policy "Company members write branches"
  on public.branches for insert to authenticated
  with check (company_id = public.current_company_id());
create policy "Company members update branches"
  on public.branches for update to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
create policy "Company members delete branches"
  on public.branches for delete to authenticated
  using (company_id = public.current_company_id());

create policy "Company members read energy_metrics"
  on public.energy_metrics for select to authenticated
  using (exists (
    select 1 from public.branches b
    where b.id = energy_metrics.branch_id
      and b.company_id = public.current_company_id()
  ));
create policy "Company members write energy_metrics"
  on public.energy_metrics for insert to authenticated
  with check (exists (
    select 1 from public.branches b
    where b.id = energy_metrics.branch_id
      and b.company_id = public.current_company_id()
  ));

create policy "Company members read diesel_logs"
  on public.diesel_logs for select to authenticated
  using (exists (
    select 1 from public.branches b
    where b.id = diesel_logs.branch_id
      and b.company_id = public.current_company_id()
  ));
create policy "Company members write diesel_logs"
  on public.diesel_logs for insert to authenticated
  with check (exists (
    select 1 from public.branches b
    where b.id = diesel_logs.branch_id
      and b.company_id = public.current_company_id()
  ));

-- ---------------------------------------------------------
-- Auto-provision a profile row on signup
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 20260514014305_ebddb4ea-1f19-40c6-9366-a8b2acdf9c41.sql ──
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "Authenticated users create companies" on public.companies;
create policy "Authenticated users create companies"
  on public.companies for insert
  to authenticated
  with check (auth.uid() is not null);

-- ── 20260514014316_37757927-1d8f-44a0-9825-a90450595711.sql ──
revoke execute on function public.current_company_id() from public, anon, authenticated;

-- ── 20260519120000_security_foundation.sql ──
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
create type public.api_key_scope as enum ('read_only', 'read_write', 'admin');

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

-- ── 20260520120000_enode_integration.sql ──
-- Enode integration: multi-tenant device links, events, telemetry cache.
-- WHY: Webhooks (service role) + mobile RLS scoped by company_id.

-- ---------------------------------------------------------------------------
-- Connections (one Enode user per company)
-- ---------------------------------------------------------------------------
create table if not exists public.enode_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  enode_user_id text not null,
  link_status text not null default 'pending'
    check (link_status in ('pending', 'linked', 'error', 'disconnected')),
  last_link_url text,
  linked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enode_connections_company_unique unique (company_id),
  constraint enode_connections_enode_user_unique unique (enode_user_id)
);

create index if not exists enode_connections_company_idx
  on public.enode_connections(company_id);

-- ---------------------------------------------------------------------------
-- Devices (inverters, chargers, batteries, …)
-- ---------------------------------------------------------------------------
create table if not exists public.enode_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  enode_device_id text not null,
  enode_user_id text not null,
  device_type text not null
    check (device_type in ('inverter', 'charger', 'battery', 'vehicle', 'hvac', 'meter', 'unknown')),
  vendor text,
  display_name text,
  is_reachable boolean not null default false,
  connection_status text not null default 'syncing'
    check (connection_status in ('connected', 'syncing', 'error', 'offline')),
  production_rate_kw numeric(12, 4),
  charge_rate_kw numeric(12, 4),
  battery_level_pct integer,
  grid_power_kw numeric(12, 4),
  raw_state jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  branch_id uuid references public.branches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enode_devices_company_device_unique unique (company_id, enode_device_id)
);

create index if not exists enode_devices_company_idx on public.enode_devices(company_id);
create index if not exists enode_devices_enode_id_idx on public.enode_devices(enode_device_id);

-- ---------------------------------------------------------------------------
-- Webhook events (audit + realtime fan-out)
-- ---------------------------------------------------------------------------
create table if not exists public.enode_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  delivery_id text not null,
  event_type text not null,
  enode_user_id text,
  enode_device_id text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint enode_events_delivery_unique unique (delivery_id)
);

create index if not exists enode_events_company_created_idx
  on public.enode_events(company_id, created_at desc);
create index if not exists enode_events_device_idx
  on public.enode_events(enode_device_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Telemetry snapshots (power chart history)
-- ---------------------------------------------------------------------------
create table if not exists public.enode_telemetry_snapshots (
  id bigserial primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  device_id uuid not null references public.enode_devices(id) on delete cascade,
  production_kw numeric(12, 4) not null default 0,
  charge_kw numeric(12, 4) not null default 0,
  grid_kw numeric(12, 4) not null default 0,
  recorded_at timestamptz not null default now()
);

create index if not exists enode_telemetry_device_time_idx
  on public.enode_telemetry_snapshots(device_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists enode_connections_updated_at on public.enode_connections;
create trigger enode_connections_updated_at
  before update on public.enode_connections
  for each row execute function public.set_updated_at();

drop trigger if exists enode_devices_updated_at on public.enode_devices;
create trigger enode_devices_updated_at
  before update on public.enode_devices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.enode_connections enable row level security;
alter table public.enode_devices enable row level security;
alter table public.enode_events enable row level security;
alter table public.enode_telemetry_snapshots enable row level security;

drop policy if exists "Company members view enode_connections" on public.enode_connections;
create policy "Company members view enode_connections"
  on public.enode_connections for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Company members insert enode_connections" on public.enode_connections;
create policy "Company members insert enode_connections"
  on public.enode_connections for insert to authenticated
  with check (company_id = public.current_company_id());

drop policy if exists "Company members update enode_connections" on public.enode_connections;
create policy "Company members update enode_connections"
  on public.enode_connections for update to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "Company members view enode_devices" on public.enode_devices;
create policy "Company members view enode_devices"
  on public.enode_devices for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Company members view enode_events" on public.enode_events;
create policy "Company members view enode_events"
  on public.enode_events for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Company members view enode_telemetry" on public.enode_telemetry_snapshots;
create policy "Company members view enode_telemetry"
  on public.enode_telemetry_snapshots for select to authenticated
  using (company_id = public.current_company_id());

-- Webhook + BFF use service_role (bypasses RLS).

-- Realtime for live device updates (idempotent)
do $$
begin
  alter publication supabase_realtime add table public.enode_devices;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enode_events;
exception
  when duplicate_object then null;
end $$;

-- ── 20260521130000_realtime_publications.sql ──
-- Enable Supabase Realtime for fleet energy metrics (idempotent).

do $$
begin
  alter publication supabase_realtime add table public.enode_telemetry_snapshots;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.energy_metrics;
exception
  when duplicate_object then null;
end $$;

-- ── 20260521143000_enode_telemetry_scaling.sql ──
-- Enode telemetry scaling foundation for 100k+ devices.
-- Goals: dedupe, delta writes, 5-min buckets, rollups, offline detection, low write-amplification.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Queue table for webhook smoothing (DB-backed queue, burst-safe)
-- -----------------------------------------------------------------------------
create table if not exists public.enode_webhook_queue (
  id bigserial primary key,
  delivery_id text not null unique,
  event_type text not null,
  enode_user_id text,
  enode_device_id text,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'processed', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

create index if not exists enode_webhook_queue_pending_idx
  on public.enode_webhook_queue(status, next_attempt_at, received_at);

-- -----------------------------------------------------------------------------
-- Enriched raw snapshots (change-only)
-- -----------------------------------------------------------------------------
alter table public.enode_telemetry_snapshots
  add column if not exists payload_hash text,
  add column if not exists connection_status text,
  add column if not exists battery_level_pct integer,
  add column if not exists fault_state text,
  add column if not exists change_reason text;

create index if not exists enode_telemetry_company_time_idx
  on public.enode_telemetry_snapshots(company_id, recorded_at desc);

create index if not exists enode_telemetry_payload_hash_idx
  on public.enode_telemetry_snapshots(device_id, payload_hash, recorded_at desc);

-- -----------------------------------------------------------------------------
-- 5-minute aggregated snapshots
-- -----------------------------------------------------------------------------
create table if not exists public.enode_telemetry_5m (
  id bigserial primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  device_id uuid not null references public.enode_devices(id) on delete cascade,
  bucket_start timestamptz not null,
  production_kw numeric(12, 4) not null default 0,
  charge_kw numeric(12, 4) not null default 0,
  grid_kw numeric(12, 4) not null default 0,
  battery_level_pct integer,
  connection_status text,
  fault_state text,
  payload_hash text,
  updated_at timestamptz not null default now(),
  constraint enode_telemetry_5m_bucket_unique unique (device_id, bucket_start)
);

create index if not exists enode_telemetry_5m_company_bucket_idx
  on public.enode_telemetry_5m(company_id, bucket_start desc);

-- -----------------------------------------------------------------------------
-- Latest per-device cache for realtime/mobile payloads
-- -----------------------------------------------------------------------------
create table if not exists public.enode_telemetry_latest (
  device_id uuid primary key references public.enode_devices(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  production_kw numeric(12, 4) not null default 0,
  charge_kw numeric(12, 4) not null default 0,
  grid_kw numeric(12, 4) not null default 0,
  battery_level_pct integer,
  connection_status text,
  fault_state text,
  payload_hash text,
  change_reason text,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enode_telemetry_latest_company_idx
  on public.enode_telemetry_latest(company_id, updated_at desc);

-- -----------------------------------------------------------------------------
-- Hourly + daily rollups for analytics/AI-friendly querying
-- -----------------------------------------------------------------------------
create table if not exists public.enode_telemetry_hourly (
  company_id uuid not null references public.companies(id) on delete cascade,
  device_id uuid not null references public.enode_devices(id) on delete cascade,
  hour_start timestamptz not null,
  avg_production_kw numeric(12, 4) not null,
  avg_charge_kw numeric(12, 4) not null,
  avg_grid_kw numeric(12, 4) not null,
  min_battery_pct integer,
  max_battery_pct integer,
  sample_count integer not null,
  updated_at timestamptz not null default now(),
  primary key (device_id, hour_start)
);

create index if not exists enode_telemetry_hourly_company_hour_idx
  on public.enode_telemetry_hourly(company_id, hour_start desc);

create table if not exists public.enode_telemetry_daily (
  company_id uuid not null references public.companies(id) on delete cascade,
  device_id uuid not null references public.enode_devices(id) on delete cascade,
  day_start date not null,
  avg_production_kw numeric(12, 4) not null,
  avg_charge_kw numeric(12, 4) not null,
  avg_grid_kw numeric(12, 4) not null,
  min_battery_pct integer,
  max_battery_pct integer,
  sample_count integer not null,
  updated_at timestamptz not null default now(),
  primary key (device_id, day_start)
);

create index if not exists enode_telemetry_daily_company_day_idx
  on public.enode_telemetry_daily(company_id, day_start desc);

-- -----------------------------------------------------------------------------
-- Alert table with dedupe keys (storm protection / cooldown windows)
-- -----------------------------------------------------------------------------
create table if not exists public.enode_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  device_id uuid references public.enode_devices(id) on delete set null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  alert_type text not null,
  title text not null,
  message text not null,
  dedupe_key text not null unique,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists enode_alerts_company_created_idx
  on public.enode_alerts(company_id, created_at desc);

-- -----------------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------------
alter table public.enode_webhook_queue enable row level security;
alter table public.enode_telemetry_5m enable row level security;
alter table public.enode_telemetry_latest enable row level security;
alter table public.enode_telemetry_hourly enable row level security;
alter table public.enode_telemetry_daily enable row level security;
alter table public.enode_alerts enable row level security;

drop policy if exists "Company members view enode_telemetry_5m" on public.enode_telemetry_5m;
create policy "Company members view enode_telemetry_5m"
  on public.enode_telemetry_5m for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Company members view enode_telemetry_latest" on public.enode_telemetry_latest;
create policy "Company members view enode_telemetry_latest"
  on public.enode_telemetry_latest for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Company members view enode_telemetry_hourly" on public.enode_telemetry_hourly;
create policy "Company members view enode_telemetry_hourly"
  on public.enode_telemetry_hourly for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Company members view enode_telemetry_daily" on public.enode_telemetry_daily;
create policy "Company members view enode_telemetry_daily"
  on public.enode_telemetry_daily for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Company members view enode_alerts" on public.enode_alerts;
create policy "Company members view enode_alerts"
  on public.enode_alerts for select to authenticated
  using (company_id = public.current_company_id());

-- queue is service-role only
drop policy if exists "No direct reads on enode_webhook_queue" on public.enode_webhook_queue;
create policy "No direct reads on enode_webhook_queue"
  on public.enode_webhook_queue for select to authenticated
  using (false);

-- -----------------------------------------------------------------------------
-- Core ingest function: dedupe + delta detection + 5m upsert + latest cache
-- -----------------------------------------------------------------------------
create or replace function public.enode_ingest_telemetry(
  p_company_id uuid,
  p_device_id uuid,
  p_recorded_at timestamptz default now(),
  p_production_kw numeric default 0,
  p_charge_kw numeric default 0,
  p_grid_kw numeric default 0,
  p_battery_level_pct integer default null,
  p_connection_status text default null,
  p_fault_state text default null,
  p_power_delta_kw numeric default 0.20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_latest record;
  v_bucket_start timestamptz;
  v_payload_hash text;
  v_reason text := 'no_delta';
  v_changed boolean := false;
  v_snapshot_id bigint := null;
begin
  v_bucket_start := date_bin('5 minutes', coalesce(p_recorded_at, now()), '2001-01-01'::timestamptz);
  v_payload_hash := encode(
    digest(
      concat_ws('|',
        p_device_id::text,
        coalesce(round(p_production_kw::numeric, 3)::text, '0'),
        coalesce(round(p_charge_kw::numeric, 3)::text, '0'),
        coalesce(round(p_grid_kw::numeric, 3)::text, '0'),
        coalesce(p_battery_level_pct::text, 'null'),
        coalesce(p_connection_status, 'null'),
        coalesce(p_fault_state, 'null')
      ),
      'sha256'
    ),
    'hex'
  );

  select *
  into v_latest
  from public.enode_telemetry_latest
  where device_id = p_device_id;

  if v_latest is null then
    v_changed := true;
    v_reason := 'first_sample';
  elsif v_latest.payload_hash is distinct from v_payload_hash then
    if abs(coalesce(v_latest.production_kw, 0) - coalesce(p_production_kw, 0)) >= p_power_delta_kw then
      v_changed := true; v_reason := 'production_delta';
    elsif abs(coalesce(v_latest.charge_kw, 0) - coalesce(p_charge_kw, 0)) >= p_power_delta_kw then
      v_changed := true; v_reason := 'charge_delta';
    elsif abs(coalesce(v_latest.grid_kw, 0) - coalesce(p_grid_kw, 0)) >= p_power_delta_kw then
      v_changed := true; v_reason := 'grid_delta';
    elsif v_latest.battery_level_pct is distinct from p_battery_level_pct then
      v_changed := true; v_reason := 'battery_change';
    elsif coalesce(v_latest.connection_status, '') is distinct from coalesce(p_connection_status, '') then
      v_changed := true; v_reason := 'status_change';
    elsif coalesce(v_latest.fault_state, '') is distinct from coalesce(p_fault_state, '') then
      v_changed := true; v_reason := 'fault_change';
    elsif coalesce(v_latest.last_seen_at, now() - interval '100 years') < now() - interval '10 minutes' then
      v_changed := true; v_reason := 'heartbeat_refresh';
    end if;
  end if;

  insert into public.enode_telemetry_latest(
    device_id, company_id, production_kw, charge_kw, grid_kw, battery_level_pct,
    connection_status, fault_state, payload_hash, change_reason, last_seen_at, updated_at
  )
  values (
    p_device_id, p_company_id, coalesce(p_production_kw, 0), coalesce(p_charge_kw, 0), coalesce(p_grid_kw, 0),
    p_battery_level_pct, p_connection_status, p_fault_state, v_payload_hash, v_reason,
    coalesce(p_recorded_at, now()), now()
  )
  on conflict (device_id) do update
    set company_id = excluded.company_id,
        production_kw = excluded.production_kw,
        charge_kw = excluded.charge_kw,
        grid_kw = excluded.grid_kw,
        battery_level_pct = excluded.battery_level_pct,
        connection_status = excluded.connection_status,
        fault_state = excluded.fault_state,
        payload_hash = excluded.payload_hash,
        change_reason = excluded.change_reason,
        last_seen_at = excluded.last_seen_at,
        updated_at = now();

  if v_changed then
    insert into public.enode_telemetry_snapshots(
      company_id, device_id, production_kw, charge_kw, grid_kw, battery_level_pct,
      connection_status, fault_state, payload_hash, change_reason, recorded_at
    )
    values (
      p_company_id, p_device_id, coalesce(p_production_kw, 0), coalesce(p_charge_kw, 0), coalesce(p_grid_kw, 0),
      p_battery_level_pct, p_connection_status, p_fault_state, v_payload_hash, v_reason, coalesce(p_recorded_at, now())
    )
    returning id into v_snapshot_id;

    insert into public.enode_telemetry_5m(
      company_id, device_id, bucket_start, production_kw, charge_kw, grid_kw, battery_level_pct,
      connection_status, fault_state, payload_hash, updated_at
    )
    values (
      p_company_id, p_device_id, v_bucket_start, coalesce(p_production_kw, 0), coalesce(p_charge_kw, 0), coalesce(p_grid_kw, 0),
      p_battery_level_pct, p_connection_status, p_fault_state, v_payload_hash, now()
    )
    on conflict (device_id, bucket_start) do update
      set production_kw = excluded.production_kw,
          charge_kw = excluded.charge_kw,
          grid_kw = excluded.grid_kw,
          battery_level_pct = excluded.battery_level_pct,
          connection_status = excluded.connection_status,
          fault_state = excluded.fault_state,
          payload_hash = excluded.payload_hash,
          updated_at = now()
      where public.enode_telemetry_5m.payload_hash is distinct from excluded.payload_hash;
  end if;

  return jsonb_build_object(
    'stored', v_changed,
    'reason', v_reason,
    'bucket_start', v_bucket_start,
    'snapshot_id', v_snapshot_id
  );
end;
$$;

grant execute on function public.enode_ingest_telemetry(
  uuid, uuid, timestamptz, numeric, numeric, numeric, integer, text, text, numeric
) to service_role;

-- -----------------------------------------------------------------------------
-- Offline detection with cooldown alerting (debounced)
-- -----------------------------------------------------------------------------
create or replace function public.enode_detect_offline(
  p_stale_minutes integer default 10,
  p_critical_minutes integer default 15,
  p_cooldown_minutes integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_warning_count integer := 0;
  v_critical_count integer := 0;
begin
  with stale as (
    select
      d.id as device_id,
      d.company_id,
      d.display_name,
      d.last_seen_at,
      case
        when d.last_seen_at is null then 'critical'
        when d.last_seen_at < now() - make_interval(mins => p_critical_minutes) then 'critical'
        when d.last_seen_at < now() - make_interval(mins => p_stale_minutes) then 'warning'
        else null
      end as severity
    from public.enode_devices d
    where d.connection_status in ('connected', 'syncing', 'offline', 'error')
  ),
  actionable as (
    select * from stale where severity is not null
  ),
  updated as (
    update public.enode_devices d
    set connection_status = case when a.severity = 'critical' then 'error' else 'offline' end,
        updated_at = now()
    from actionable a
    where d.id = a.device_id
      and d.connection_status is distinct from case when a.severity = 'critical' then 'error' else 'offline' end
    returning d.id
  )
  insert into public.enode_alerts(
    company_id, device_id, severity, alert_type, title, message, dedupe_key
  )
  select
    a.company_id,
    a.device_id,
    a.severity,
    'device_offline',
    case when a.severity = 'critical' then 'Critical device offline' else 'Device telemetry stale' end,
    case
      when a.last_seen_at is null then coalesce(a.display_name, 'Device') || ' has never reported telemetry'
      else coalesce(a.display_name, 'Device') || ' last seen at ' || to_char(a.last_seen_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') || ' UTC'
    end,
    concat_ws(':',
      a.device_id::text,
      a.severity,
      date_bin(make_interval(mins => p_cooldown_minutes), now(), '2001-01-01'::timestamptz)::text
    ) as dedupe_key
  from actionable a
  on conflict (dedupe_key) do nothing;

  select count(*) into v_warning_count from public.enode_alerts
    where alert_type = 'device_offline'
      and severity = 'warning'
      and created_at > now() - interval '5 minutes';

  select count(*) into v_critical_count from public.enode_alerts
    where alert_type = 'device_offline'
      and severity = 'critical'
      and created_at > now() - interval '5 minutes';

  return jsonb_build_object(
    'warning_alerts_5m', v_warning_count,
    'critical_alerts_5m', v_critical_count
  );
end;
$$;

grant execute on function public.enode_detect_offline(integer, integer, integer) to service_role;

-- -----------------------------------------------------------------------------
-- Rollups for AI + analytics
-- -----------------------------------------------------------------------------
create or replace function public.enode_rollup_hourly(p_hours_back integer default 72)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  insert into public.enode_telemetry_hourly(
    company_id, device_id, hour_start, avg_production_kw, avg_charge_kw, avg_grid_kw,
    min_battery_pct, max_battery_pct, sample_count, updated_at
  )
  select
    t.company_id,
    t.device_id,
    date_trunc('hour', t.bucket_start) as hour_start,
    avg(t.production_kw)::numeric(12,4),
    avg(t.charge_kw)::numeric(12,4),
    avg(t.grid_kw)::numeric(12,4),
    min(t.battery_level_pct),
    max(t.battery_level_pct),
    count(*)::integer,
    now()
  from public.enode_telemetry_5m t
  where t.bucket_start >= now() - make_interval(hours => p_hours_back)
  group by t.company_id, t.device_id, date_trunc('hour', t.bucket_start)
  on conflict (device_id, hour_start) do update
    set avg_production_kw = excluded.avg_production_kw,
        avg_charge_kw = excluded.avg_charge_kw,
        avg_grid_kw = excluded.avg_grid_kw,
        min_battery_pct = excluded.min_battery_pct,
        max_battery_pct = excluded.max_battery_pct,
        sample_count = excluded.sample_count,
        updated_at = now();

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

grant execute on function public.enode_rollup_hourly(integer) to service_role;

create or replace function public.enode_rollup_daily(p_days_back integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer := 0;
begin
  insert into public.enode_telemetry_daily(
    company_id, device_id, day_start, avg_production_kw, avg_charge_kw, avg_grid_kw,
    min_battery_pct, max_battery_pct, sample_count, updated_at
  )
  select
    h.company_id,
    h.device_id,
    date_trunc('day', h.hour_start)::date as day_start,
    avg(h.avg_production_kw)::numeric(12,4),
    avg(h.avg_charge_kw)::numeric(12,4),
    avg(h.avg_grid_kw)::numeric(12,4),
    min(h.min_battery_pct),
    max(h.max_battery_pct),
    sum(h.sample_count)::integer,
    now()
  from public.enode_telemetry_hourly h
  where h.hour_start >= now() - make_interval(days => p_days_back)
  group by h.company_id, h.device_id, date_trunc('day', h.hour_start)::date
  on conflict (device_id, day_start) do update
    set avg_production_kw = excluded.avg_production_kw,
        avg_charge_kw = excluded.avg_charge_kw,
        avg_grid_kw = excluded.avg_grid_kw,
        min_battery_pct = excluded.min_battery_pct,
        max_battery_pct = excluded.max_battery_pct,
        sample_count = excluded.sample_count,
        updated_at = now();

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

grant execute on function public.enode_rollup_daily(integer) to service_role;

create or replace function public.enode_prune_telemetry(
  p_raw_days integer default 14,
  p_5m_days integer default 120,
  p_hourly_days integer default 730
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw_deleted integer := 0;
  v_5m_deleted integer := 0;
  v_hourly_deleted integer := 0;
begin
  delete from public.enode_telemetry_snapshots
  where recorded_at < now() - make_interval(days => p_raw_days);
  get diagnostics v_raw_deleted = row_count;

  delete from public.enode_telemetry_5m
  where bucket_start < now() - make_interval(days => p_5m_days);
  get diagnostics v_5m_deleted = row_count;

  delete from public.enode_telemetry_hourly
  where hour_start < now() - make_interval(days => p_hourly_days);
  get diagnostics v_hourly_deleted = row_count;

  return jsonb_build_object(
    'raw_deleted', v_raw_deleted,
    'five_min_deleted', v_5m_deleted,
    'hourly_deleted', v_hourly_deleted
  );
end;
$$;

grant execute on function public.enode_prune_telemetry(integer, integer, integer) to service_role;

-- -----------------------------------------------------------------------------
-- Realtime publications for low-bandwidth change-only dashboard updates
-- -----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.enode_telemetry_latest;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enode_alerts;
exception
  when duplicate_object then null;
end $$;

-- ── 20260521162000_mobile_push_notifications.sql ──
create table if not exists public.mobile_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  app_version text not null default '1.0.0',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (expo_push_token)
);

create index if not exists idx_mobile_push_tokens_company_enabled
  on public.mobile_push_tokens (company_id, enabled, updated_at desc);

create table if not exists public.push_notification_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  event_fingerprint text not null,
  payload jsonb not null default '{}'::jsonb,
  sent_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (event_type, event_fingerprint)
);

create index if not exists idx_push_notification_events_company_created
  on public.push_notification_events (company_id, created_at desc);

alter table public.mobile_push_tokens enable row level security;
alter table public.push_notification_events enable row level security;

drop policy if exists "Members view company push tokens" on public.mobile_push_tokens;
create policy "Members view company push tokens"
  on public.mobile_push_tokens
  for select
  using (company_id = public.current_company_id());

drop policy if exists "Members manage own push token" on public.mobile_push_tokens;
create policy "Members manage own push token"
  on public.mobile_push_tokens
  for all
  using (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  )
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );

drop policy if exists "Members view company push events" on public.push_notification_events;
create policy "Members view company push events"
  on public.push_notification_events
  for select
  using (company_id = public.current_company_id());

-- ── 20260522001000_sites_telemetry_prereq.sql ──
-- Ensure telemetry prerequisites exist on legacy projects.
-- Some projects were bootstrapped without public.sites, which blocks
-- enterprise telemetry migrations that reference site_id foreign keys.

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null default 'Primary Site',
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sites_company_idx on public.sites(company_id);

alter table public.sites enable row level security;

drop policy if exists "Company members view sites" on public.sites;
create policy "Company members view sites"
  on public.sites for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Company members write sites" on public.sites;
create policy "Company members write sites"
  on public.sites for insert to authenticated
  with check (company_id = public.current_company_id());

drop policy if exists "Company members update sites" on public.sites;
create policy "Company members update sites"
  on public.sites for update to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

drop policy if exists "Company members delete sites" on public.sites;
create policy "Company members delete sites"
  on public.sites for delete to authenticated
  using (company_id = public.current_company_id());

-- ── 20260522003000_enterprise_telemetry_compat.sql ──
-- Compatibility migration for projects where enterprise telemetry migration
-- could not be applied due partition/constraint incompatibilities.
-- Creates non-partitioned telemetry tables + required RPCs used by ingest flow.

create extension if not exists pgcrypto;

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'tenant_id', '')::uuid,
    nullif(auth.jwt() ->> 'company_id', '')::uuid
  );
$$;

create table if not exists public.telemetry_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  device_id uuid not null references public.enode_devices(id) on delete cascade,
  solar_output_kw numeric(12,4) not null default 0,
  load_draw_kw numeric(12,4) not null default 0,
  battery_soc_percent numeric(6,3),
  battery_voltage numeric(12,4),
  inverter_status text,
  grid_status text,
  generator_status text,
  inverter_temperature numeric(8,3),
  daily_energy_kwh numeric(14,4),
  total_energy_kwh numeric(18,4),
  fault_code text,
  warning_code text,
  raw_payload jsonb not null default '{}'::jsonb,
  telemetry_hash text not null,
  created_at timestamptz not null default now(),
  system_timestamp timestamptz not null
);

create unique index if not exists telemetry_logs_dedupe_uniq
  on public.telemetry_logs(tenant_id, device_id, telemetry_hash, system_timestamp);
create index if not exists telemetry_logs_tenant_site_time_idx
  on public.telemetry_logs(tenant_id, site_id, created_at desc);
create index if not exists telemetry_logs_device_time_idx
  on public.telemetry_logs(device_id, created_at desc);

create table if not exists public.telemetry_latest_state (
  device_id uuid primary key references public.enode_devices(id) on delete cascade,
  tenant_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  solar_output_kw numeric(12,4) not null default 0,
  load_draw_kw numeric(12,4) not null default 0,
  battery_soc_percent numeric(6,3),
  battery_voltage numeric(12,4),
  inverter_status text,
  grid_status text,
  generator_status text,
  inverter_temperature numeric(8,3),
  daily_energy_kwh numeric(14,4),
  total_energy_kwh numeric(18,4),
  fault_code text,
  warning_code text,
  telemetry_hash text not null,
  changed_fields text[] not null default '{}'::text[],
  system_timestamp timestamptz not null,
  last_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telemetry_latest_tenant_site_idx
  on public.telemetry_latest_state(tenant_id, site_id, updated_at desc);

create table if not exists public.telemetry_site_summary (
  tenant_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  device_count integer not null default 0,
  online_count integer not null default 0,
  fault_count integer not null default 0,
  total_solar_kw numeric(14,4) not null default 0,
  total_load_kw numeric(14,4) not null default 0,
  avg_battery_soc numeric(8,3),
  stale_device_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, site_id)
);

create or replace function public.ingest_telemetry_log(
  p_tenant_id uuid,
  p_site_id uuid,
  p_device_id uuid,
  p_solar_output_kw numeric,
  p_load_draw_kw numeric,
  p_battery_soc_percent numeric,
  p_battery_voltage numeric,
  p_inverter_status text,
  p_grid_status text,
  p_generator_status text,
  p_inverter_temperature numeric,
  p_daily_energy_kwh numeric,
  p_total_energy_kwh numeric,
  p_fault_code text,
  p_warning_code text,
  p_raw_payload jsonb,
  p_telemetry_hash text,
  p_system_timestamp timestamptz,
  p_delta_threshold numeric default 0.20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_latest public.telemetry_latest_state%rowtype;
  v_changed boolean := false;
  v_changed_fields text[] := '{}'::text[];
  v_inserted boolean := false;
begin
  if p_system_timestamp is null then
    p_system_timestamp := now();
  end if;

  select * into v_latest
  from public.telemetry_latest_state
  where device_id = p_device_id;

  if not found then
    v_changed := true;
    v_changed_fields := array['first_sample'];
  elsif v_latest.telemetry_hash is distinct from p_telemetry_hash then
    if abs(coalesce(v_latest.solar_output_kw, 0) - coalesce(p_solar_output_kw, 0)) >= p_delta_threshold then
      v_changed := true; v_changed_fields := array_append(v_changed_fields, 'solar_output_kw');
    end if;
    if abs(coalesce(v_latest.load_draw_kw, 0) - coalesce(p_load_draw_kw, 0)) >= p_delta_threshold then
      v_changed := true; v_changed_fields := array_append(v_changed_fields, 'load_draw_kw');
    end if;
    if coalesce(v_latest.battery_soc_percent, -1) is distinct from coalesce(p_battery_soc_percent, -1) then
      v_changed := true; v_changed_fields := array_append(v_changed_fields, 'battery_soc_percent');
    end if;
    if coalesce(v_latest.inverter_status, '') is distinct from coalesce(p_inverter_status, '') then
      v_changed := true; v_changed_fields := array_append(v_changed_fields, 'inverter_status');
    end if;
    if coalesce(v_latest.fault_code, '') is distinct from coalesce(p_fault_code, '') then
      v_changed := true; v_changed_fields := array_append(v_changed_fields, 'fault_code');
    end if;
    if coalesce(v_latest.warning_code, '') is distinct from coalesce(p_warning_code, '') then
      v_changed := true; v_changed_fields := array_append(v_changed_fields, 'warning_code');
    end if;
    if coalesce(v_latest.system_timestamp, now() - interval '100 years') < now() - interval '10 minutes' then
      v_changed := true; v_changed_fields := array_append(v_changed_fields, 'heartbeat_refresh');
    end if;
  end if;

  insert into public.telemetry_latest_state(
    device_id, tenant_id, site_id,
    solar_output_kw, load_draw_kw, battery_soc_percent, battery_voltage,
    inverter_status, grid_status, generator_status, inverter_temperature,
    daily_energy_kwh, total_energy_kwh, fault_code, warning_code,
    telemetry_hash, changed_fields, system_timestamp, last_seen, updated_at
  )
  values (
    p_device_id, p_tenant_id, p_site_id,
    coalesce(p_solar_output_kw, 0), coalesce(p_load_draw_kw, 0), p_battery_soc_percent, p_battery_voltage,
    p_inverter_status, p_grid_status, p_generator_status, p_inverter_temperature,
    p_daily_energy_kwh, p_total_energy_kwh, p_fault_code, p_warning_code,
    p_telemetry_hash, v_changed_fields, p_system_timestamp, now(), now()
  )
  on conflict (device_id) do update
    set tenant_id = excluded.tenant_id,
        site_id = excluded.site_id,
        solar_output_kw = excluded.solar_output_kw,
        load_draw_kw = excluded.load_draw_kw,
        battery_soc_percent = excluded.battery_soc_percent,
        battery_voltage = excluded.battery_voltage,
        inverter_status = excluded.inverter_status,
        grid_status = excluded.grid_status,
        generator_status = excluded.generator_status,
        inverter_temperature = excluded.inverter_temperature,
        daily_energy_kwh = excluded.daily_energy_kwh,
        total_energy_kwh = excluded.total_energy_kwh,
        fault_code = excluded.fault_code,
        warning_code = excluded.warning_code,
        telemetry_hash = excluded.telemetry_hash,
        changed_fields = excluded.changed_fields,
        system_timestamp = excluded.system_timestamp,
        last_seen = now(),
        updated_at = now();

  if v_changed then
    insert into public.telemetry_logs(
      tenant_id, site_id, device_id,
      solar_output_kw, load_draw_kw, battery_soc_percent, battery_voltage,
      inverter_status, grid_status, generator_status, inverter_temperature,
      daily_energy_kwh, total_energy_kwh, fault_code, warning_code,
      raw_payload, telemetry_hash, system_timestamp
    )
    values (
      p_tenant_id, p_site_id, p_device_id,
      coalesce(p_solar_output_kw, 0), coalesce(p_load_draw_kw, 0), p_battery_soc_percent, p_battery_voltage,
      p_inverter_status, p_grid_status, p_generator_status, p_inverter_temperature,
      p_daily_energy_kwh, p_total_energy_kwh, p_fault_code, p_warning_code,
      coalesce(p_raw_payload, '{}'::jsonb), p_telemetry_hash, p_system_timestamp
    )
    on conflict (tenant_id, device_id, telemetry_hash, system_timestamp) do nothing;
    v_inserted := true;
  end if;

  return jsonb_build_object(
    'persisted', v_inserted,
    'changed', v_changed,
    'changed_fields', v_changed_fields
  );
end;
$$;

grant execute on function public.ingest_telemetry_log(
  uuid, uuid, uuid, numeric, numeric, numeric, numeric, text, text, text,
  numeric, numeric, numeric, text, text, jsonb, text, timestamptz, numeric
) to service_role;

create or replace function public.refresh_telemetry_site_summary(p_tenant_id uuid, p_site_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.telemetry_site_summary(
    tenant_id, site_id, device_count, online_count, fault_count,
    total_solar_kw, total_load_kw, avg_battery_soc, stale_device_count, updated_at
  )
  select
    p_tenant_id,
    p_site_id,
    count(*)::integer,
    count(*) filter (where coalesce(inverter_status, '') in ('online', 'connected', 'running'))::integer,
    count(*) filter (where coalesce(fault_code, '') <> '' or coalesce(inverter_status, '') in ('fault', 'error'))::integer,
    coalesce(sum(solar_output_kw), 0),
    coalesce(sum(load_draw_kw), 0),
    avg(battery_soc_percent),
    count(*) filter (where system_timestamp < now() - interval '10 minutes')::integer,
    now()
  from public.telemetry_latest_state
  where tenant_id = p_tenant_id
    and site_id = p_site_id
  on conflict (tenant_id, site_id) do update
    set device_count = excluded.device_count,
        online_count = excluded.online_count,
        fault_count = excluded.fault_count,
        total_solar_kw = excluded.total_solar_kw,
        total_load_kw = excluded.total_load_kw,
        avg_battery_soc = excluded.avg_battery_soc,
        stale_device_count = excluded.stale_device_count,
        updated_at = now();
$$;

grant execute on function public.refresh_telemetry_site_summary(uuid, uuid) to service_role;

alter table public.telemetry_logs enable row level security;
alter table public.telemetry_latest_state enable row level security;
alter table public.telemetry_site_summary enable row level security;

drop policy if exists "Tenant read telemetry_logs" on public.telemetry_logs;
create policy "Tenant read telemetry_logs"
  on public.telemetry_logs for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "Tenant read telemetry_latest_state" on public.telemetry_latest_state;
create policy "Tenant read telemetry_latest_state"
  on public.telemetry_latest_state for select to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "Tenant read telemetry_site_summary" on public.telemetry_site_summary;
create policy "Tenant read telemetry_site_summary"
  on public.telemetry_site_summary for select to authenticated
  using (tenant_id = public.current_tenant_id());

do $$
begin
  alter publication supabase_realtime add table public.telemetry_logs;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.telemetry_latest_state;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.telemetry_site_summary;
exception when duplicate_object then null;
end $$;

-- ── 20260523120000_sites_coordinates.sql ──
-- Site coordinates for fleet map (Sites tab only).
alter table public.sites
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists sites_company_coords_idx
  on public.sites (company_id)
  where latitude is not null and longitude is not null;

-- ── 20260523130000_solarman_integration.sql ──
-- Solarman OpenAPI integration — credentials, plant links, device sync metadata.
-- Tokens are server-side only (edge functions use service role).

create table if not exists public.solarman_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  solarman_user_id text not null,
  link_status text not null default 'pending'
    check (link_status in ('pending', 'linked', 'error', 'disconnected')),
  account_label text,
  org_id integer,
  org_name text,
  access_token text,
  refresh_token text,
  token_type text default 'bearer',
  expires_at timestamptz,
  uid integer,
  last_error text,
  linked_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint solarman_connections_company_unique unique (company_id),
  constraint solarman_connections_user_unique unique (solarman_user_id)
);

create index if not exists solarman_connections_company_idx
  on public.solarman_connections(company_id);

create table if not exists public.solarman_stations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  solarman_station_id integer not null,
  name text not null,
  installed_capacity numeric(12, 4),
  location_address text,
  location_lat numeric(10, 6),
  location_lng numeric(10, 6),
  network_status text,
  battery_soc numeric(6, 2),
  raw_state jsonb not null default '{}'::jsonb,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint solarman_stations_company_station_unique unique (company_id, solarman_station_id)
);

create index if not exists solarman_stations_company_idx on public.solarman_stations(company_id);
create index if not exists solarman_stations_site_idx on public.solarman_stations(site_id);

drop trigger if exists solarman_connections_updated_at on public.solarman_connections;
create trigger solarman_connections_updated_at
  before update on public.solarman_connections
  for each row execute function public.set_updated_at();

drop trigger if exists solarman_stations_updated_at on public.solarman_stations;
create trigger solarman_stations_updated_at
  before update on public.solarman_stations
  for each row execute function public.set_updated_at();

alter table public.solarman_connections enable row level security;
alter table public.solarman_stations enable row level security;

drop policy if exists solarman_connections_select on public.solarman_connections;
create policy solarman_connections_select on public.solarman_connections
  for select using (
    company_id = (
      select p.company_id from public.profiles p where p.id = auth.uid()
    )
  );

drop policy if exists solarman_stations_select on public.solarman_stations;
create policy solarman_stations_select on public.solarman_stations
  for select using (
    company_id = (
      select p.company_id from public.profiles p where p.id = auth.uid()
    )
  );

comment on table public.solarman_connections is 'Solarman OpenAPI OAuth tokens — write via service role only.';
comment on table public.solarman_stations is 'Linked Solarman plants mapped to ESO sites.';

-- ── 20260525130000_drop_eso_intelligence.sql ──
-- Remove ESO Pay site-fleet intelligence tables (fleet monitoring lives in main app, not Eso Pay)

drop table if exists public.intelligence_notification_log cascade;
drop table if exists public.intelligence_snooze_events cascade;
drop table if exists public.intelligence_recharge_events cascade;
drop table if exists public.intelligence_meter_snapshots cascade;
drop table if exists public.intelligence_meters cascade;

-- ── 20260528120000_payments_monnify.sql ──
-- Eso Pay — Monnify wallet, bills, utility catalog, ledger (production)

-- ─── Company wallets ─────────────────────────────────────────────────────────

create table if not exists public.company_wallets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  monnify_wallet_reference text not null unique,
  balance_kobo bigint not null default 0 check (balance_kobo >= 0),
  currency char(3) not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended')),
  reserved_account_number text,
  reserved_account_name text,
  reserved_bank_name text,
  reserved_bank_code text,
  monnify_account_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_wallets_company_id on public.company_wallets(company_id);
create index if not exists idx_company_wallets_monnify_ref on public.company_wallets(monnify_wallet_reference);

-- ─── Wallet ledger ───────────────────────────────────────────────────────────

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  wallet_id uuid not null references public.company_wallets(id) on delete cascade,
  type text not null check (type in ('credit', 'debit', 'bill_payment', 'refund', 'reversal')),
  amount_kobo bigint not null check (amount_kobo > 0),
  balance_after_kobo bigint,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  monnify_transaction_reference text unique,
  monnify_payment_reference text,
  narration text,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_transactions_company_id on public.wallet_transactions(company_id);
create index if not exists idx_wallet_transactions_wallet_id on public.wallet_transactions(wallet_id);
create index if not exists idx_wallet_transactions_monnify_tx_ref on public.wallet_transactions(monnify_transaction_reference);
create index if not exists idx_wallet_transactions_payment_ref on public.wallet_transactions(monnify_payment_reference);
create index if not exists idx_wallet_transactions_created_at on public.wallet_transactions(created_at desc);

-- ─── Bills + offsets ─────────────────────────────────────────────────────────

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete restrict,
  utility_provider text not null,
  account_number text not null,
  billing_period_start timestamptz not null,
  billing_period_end timestamptz not null,
  gross_amount_kobo bigint not null check (gross_amount_kobo >= 0),
  offset_amount_kobo bigint not null default 0 check (offset_amount_kobo >= 0),
  net_amount_kobo bigint generated always as (gross_amount_kobo - offset_amount_kobo) stored,
  currency char(3) not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'offset_calculated', 'payment_initiated', 'paid', 'overdue', 'void')),
  due_date timestamptz not null,
  invoice_pdf_url text,
  raw_meter_reading_kwh numeric(12, 4),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bills_company_id on public.bills(company_id);
create index if not exists idx_bills_status on public.bills(status);
create index if not exists idx_bills_due_date on public.bills(due_date);
create index if not exists idx_bills_company_period on public.bills(company_id, billing_period_start, billing_period_end);

create table if not exists public.inverter_offsets (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  inverter_id text not null,
  inverter_serial text not null,
  generation_kwh numeric(12, 4) not null check (generation_kwh >= 0),
  offset_kwh numeric(12, 4) not null check (offset_kwh >= 0),
  tariff_rate_per_kwh numeric(10, 4) not null,
  offset_value_kobo bigint not null,
  offset_percentage numeric(5, 2) not null check (offset_percentage between 0 and 100),
  calculation_method text not null default 'net_metering',
  data_source text not null default 'telemetry',
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),
  unique (bill_id, inverter_id)
);

create index if not exists idx_inverter_offsets_bill_id on public.inverter_offsets(bill_id);
create index if not exists idx_inverter_offsets_company_id on public.inverter_offsets(company_id);

-- ─── Monnify bill settlements ────────────────────────────────────────────────

create table if not exists public.monnify_bill_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete cascade,
  wallet_transaction_id uuid references public.wallet_transactions(id),
  monnify_payment_reference text not null unique,
  monnify_transaction_reference text unique,
  monnify_biller_code text not null,
  customer_account_number text not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  currency char(3) not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'success', 'failed', 'reversed')),
  failure_code text,
  failure_message text,
  idempotency_key text not null unique,
  initiated_by uuid not null references auth.users(id),
  webhook_received_at timestamptz,
  token_or_receipt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_monnify_bill_payments_bill_id on public.monnify_bill_payments(bill_id);
create index if not exists idx_monnify_bill_payments_company_id on public.monnify_bill_payments(company_id);

-- ─── Ad-hoc utility purchases (Quick Pay) ────────────────────────────────────

create table if not exists public.utility_purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  utility_provider_id uuid not null,
  account_number text not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  currency char(3) not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'success', 'failed', 'reversed')),
  monnify_payment_reference text not null unique,
  monnify_transaction_reference text unique,
  wallet_transaction_id uuid references public.wallet_transactions(id),
  token_or_receipt text,
  failure_code text,
  failure_message text,
  idempotency_key text not null unique,
  initiated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_utility_purchases_company_id on public.utility_purchases(company_id);

-- ─── Funding intents ─────────────────────────────────────────────────────────

create table if not exists public.eso_pay_funding_intents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  amount_kobo bigint not null check (amount_kobo > 0),
  reserved_account_reference text not null,
  idempotency_key text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'fulfilled', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Utility catalog (synced from Monnify) ───────────────────────────────────

create table if not exists public.utility_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'other'
    check (category in ('electricity', 'airtime', 'water', 'tv', 'data', 'other')),
  monnify_biller_code text not null,
  monnify_product_code text not null,
  is_active boolean not null default true,
  minimum_amount_kobo bigint,
  maximum_amount_kobo bigint,
  synced_at timestamptz not null default now(),
  unique (monnify_biller_code, monnify_product_code)
);

create index if not exists idx_utility_providers_category on public.utility_providers(category);
create index if not exists idx_utility_providers_biller on public.utility_providers(monnify_biller_code);

-- ─── updated_at triggers ─────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bills_set_updated_at on public.bills;
create trigger bills_set_updated_at
  before update on public.bills
  for each row execute function public.set_updated_at();

drop trigger if exists company_wallets_set_updated_at on public.company_wallets;
create trigger company_wallets_set_updated_at
  before update on public.company_wallets
  for each row execute function public.set_updated_at();

-- ─── Wallet credit (webhook-safe, idempotent) ────────────────────────────────

create or replace function public.esopay_credit_wallet(
  p_company_id uuid,
  p_amount_kobo bigint,
  p_monnify_tx_ref text,
  p_monnify_payment_ref text default null,
  p_narration text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.company_wallets;
  v_tx public.wallet_transactions;
  v_new_balance bigint;
begin
  if p_amount_kobo <= 0 then
    raise exception 'amount must be positive';
  end if;

  select * into v_wallet
  from public.company_wallets
  where company_id = p_company_id
  for update;

  if not found then
    raise exception 'wallet not found for company %', p_company_id;
  end if;

  if p_monnify_tx_ref is not null then
    select * into v_tx
    from public.wallet_transactions
    where monnify_transaction_reference = p_monnify_tx_ref;

    if found then
      return v_tx;
    end if;
  end if;

  v_new_balance := v_wallet.balance_kobo + p_amount_kobo;

  update public.company_wallets
  set balance_kobo = v_new_balance,
      status = 'active',
      updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions (
    company_id, wallet_id, type, amount_kobo, balance_after_kobo, status,
    monnify_transaction_reference, monnify_payment_reference, narration, metadata
  ) values (
    p_company_id, v_wallet.id, 'credit', p_amount_kobo, v_new_balance, 'success',
    p_monnify_tx_ref, p_monnify_payment_ref, p_narration, p_metadata
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

-- ─── Wallet debit (payments) ─────────────────────────────────────────────────

create or replace function public.esopay_debit_wallet(
  p_company_id uuid,
  p_amount_kobo bigint,
  p_type text,
  p_monnify_payment_ref text,
  p_narration text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.company_wallets;
  v_tx public.wallet_transactions;
  v_new_balance bigint;
begin
  if p_amount_kobo <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_idempotency_key is not null then
    select * into v_tx from public.wallet_transactions where idempotency_key = p_idempotency_key;
    if found then return v_tx; end if;
  end if;

  select * into v_wallet
  from public.company_wallets
  where company_id = p_company_id
  for update;

  if not found then
    raise exception 'wallet not found';
  end if;

  if v_wallet.balance_kobo < p_amount_kobo then
    raise exception 'insufficient wallet balance' using errcode = 'P0001';
  end if;

  v_new_balance := v_wallet.balance_kobo - p_amount_kobo;

  update public.company_wallets
  set balance_kobo = v_new_balance, updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions (
    company_id, wallet_id, type, amount_kobo, balance_after_kobo, status,
    monnify_payment_reference, narration, metadata, idempotency_key
  ) values (
    p_company_id, v_wallet.id, coalesce(p_type, 'debit'), p_amount_kobo, v_new_balance, 'success',
    p_monnify_payment_ref, p_narration, p_metadata, p_idempotency_key
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

grant execute on function public.esopay_credit_wallet(uuid, bigint, text, text, text, jsonb) to service_role;
grant execute on function public.esopay_debit_wallet(uuid, bigint, text, text, text, jsonb, text) to service_role;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.company_wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.bills enable row level security;
alter table public.inverter_offsets enable row level security;
alter table public.monnify_bill_payments enable row level security;
alter table public.utility_purchases enable row level security;
alter table public.eso_pay_funding_intents enable row level security;
alter table public.utility_providers enable row level security;

create policy "Members view company wallet"
  on public.company_wallets for select to authenticated
  using (company_id = public.current_company_id());

create policy "Members view wallet transactions"
  on public.wallet_transactions for select to authenticated
  using (company_id = public.current_company_id());

create policy "Members view bills"
  on public.bills for select to authenticated
  using (company_id = public.current_company_id());

create policy "Members view inverter offsets"
  on public.inverter_offsets for select to authenticated
  using (company_id = public.current_company_id());

create policy "Members view bill payments"
  on public.monnify_bill_payments for select to authenticated
  using (company_id = public.current_company_id());

create policy "Members view utility purchases"
  on public.utility_purchases for select to authenticated
  using (company_id = public.current_company_id());

create policy "Members view funding intents"
  on public.eso_pay_funding_intents for select to authenticated
  using (company_id = public.current_company_id());

create policy "Authenticated users view utility catalog"
  on public.utility_providers for select to authenticated
  using (is_active = true);
