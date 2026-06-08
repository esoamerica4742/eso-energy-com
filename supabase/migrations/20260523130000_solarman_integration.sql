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
