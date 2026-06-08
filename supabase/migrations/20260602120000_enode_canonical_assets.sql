-- Canonical Enode asset model (maps to existing enode_* tables for API/docs compatibility).
-- Note: enterprise telemetry uses public.telemetry_logs (tenant/device schema).
-- Canonical per-asset samples live in public.asset_telemetry_logs.

create table if not exists public.enode_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  enode_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enode_users_user_unique unique (user_id),
  constraint enode_users_enode_user_unique unique (enode_user_id)
);

create index if not exists enode_users_company_idx on public.enode_users(company_id);

create table if not exists public.energy_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  enode_asset_id text not null,
  enode_user_id text not null,
  vendor text,
  model text,
  asset_type text not null default 'inverter'
    check (asset_type in ('inverter', 'charger', 'battery', 'meter', 'unknown')),
  capacity_kw numeric(12, 4),
  enode_device_row_id uuid references public.enode_devices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint energy_assets_company_asset_unique unique (company_id, enode_asset_id)
);

create index if not exists energy_assets_company_idx on public.energy_assets(company_id);

create table if not exists public.asset_telemetry_logs (
  id bigserial primary key,
  asset_id uuid not null references public.energy_assets(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  production_kw numeric(12, 4) not null default 0,
  constraint asset_telemetry_logs_asset_time_unique unique (asset_id, recorded_at)
);

create index if not exists asset_telemetry_logs_asset_time_idx
  on public.asset_telemetry_logs(asset_id, recorded_at desc);

-- Backfill enode_users from connections + profiles
insert into public.enode_users (user_id, company_id, enode_user_id)
select distinct on (c.company_id)
  p.id,
  c.company_id,
  c.enode_user_id
from public.enode_connections c
join public.profiles p on p.company_id = c.company_id
where c.enode_user_id is not null
on conflict (enode_user_id) do nothing;

-- Backfill energy_assets from enode_devices
insert into public.energy_assets (
  company_id,
  enode_asset_id,
  enode_user_id,
  vendor,
  model,
  asset_type,
  capacity_kw,
  enode_device_row_id
)
select
  d.company_id,
  d.enode_device_id,
  d.enode_user_id,
  d.vendor,
  coalesce(d.display_name, d.vendor),
  d.device_type,
  coalesce(d.production_rate_kw, 0),
  d.id
from public.enode_devices d
on conflict (company_id, enode_asset_id) do update set
  vendor = excluded.vendor,
  model = excluded.model,
  asset_type = excluded.asset_type,
  capacity_kw = excluded.capacity_kw,
  enode_device_row_id = excluded.enode_device_row_id,
  updated_at = now();

alter table public.enode_users enable row level security;
alter table public.energy_assets enable row level security;
alter table public.asset_telemetry_logs enable row level security;

drop policy if exists enode_users_company on public.enode_users;
create policy enode_users_company on public.enode_users
  for select using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

drop policy if exists energy_assets_company on public.energy_assets;
create policy energy_assets_company on public.energy_assets
  for select using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );

drop policy if exists asset_telemetry_logs_company on public.asset_telemetry_logs;
create policy asset_telemetry_logs_company on public.asset_telemetry_logs
  for select using (
    company_id in (select company_id from public.profiles where id = auth.uid())
  );
