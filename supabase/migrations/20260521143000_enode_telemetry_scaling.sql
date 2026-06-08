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
