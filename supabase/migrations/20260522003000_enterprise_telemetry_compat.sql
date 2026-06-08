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
