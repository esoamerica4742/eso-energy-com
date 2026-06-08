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
