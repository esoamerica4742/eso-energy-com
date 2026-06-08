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
