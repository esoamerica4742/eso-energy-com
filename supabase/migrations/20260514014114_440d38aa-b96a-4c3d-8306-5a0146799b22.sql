
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
drop policy if exists "Members view own company" on public.companies;
create policy "Members view own company"
  on public.companies for select
  to authenticated
  using (id = public.current_company_id());

drop policy if exists "Authenticated users create companies" on public.companies;
create policy "Authenticated users create companies"
  on public.companies for insert
  to authenticated
  with check (true);

drop policy if exists "Members update own company" on public.companies;
create policy "Members update own company"
  on public.companies for update
  to authenticated
  using (id = public.current_company_id())
  with check (id = public.current_company_id());

-- ---------------------------------------------------------
-- Policies: profiles  (own row + same-company visibility)
-- ---------------------------------------------------------
drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users view profiles in same company" on public.profiles;
create policy "Users view profiles in same company"
  on public.profiles for select
  to authenticated
  using (company_id is not null and company_id = public.current_company_id());

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------
-- Policies: branches / energy_metrics / diesel_logs
-- All scoped to the caller's company.
-- ---------------------------------------------------------
drop policy if exists "Company members read branches" on public.branches;
create policy "Company members read branches"
  on public.branches for select to authenticated
  using (company_id = public.current_company_id());
drop policy if exists "Company members write branches" on public.branches;
create policy "Company members write branches"
  on public.branches for insert to authenticated
  with check (company_id = public.current_company_id());
drop policy if exists "Company members update branches" on public.branches;
create policy "Company members update branches"
  on public.branches for update to authenticated
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
drop policy if exists "Company members delete branches" on public.branches;
create policy "Company members delete branches"
  on public.branches for delete to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Company members read energy_metrics" on public.energy_metrics;
create policy "Company members read energy_metrics"
  on public.energy_metrics for select to authenticated
  using (exists (
    select 1 from public.branches b
    where b.id = energy_metrics.branch_id
      and b.company_id = public.current_company_id()
  ));
drop policy if exists "Company members write energy_metrics" on public.energy_metrics;
create policy "Company members write energy_metrics"
  on public.energy_metrics for insert to authenticated
  with check (exists (
    select 1 from public.branches b
    where b.id = energy_metrics.branch_id
      and b.company_id = public.current_company_id()
  ));

drop policy if exists "Company members read diesel_logs" on public.diesel_logs;
create policy "Company members read diesel_logs"
  on public.diesel_logs for select to authenticated
  using (exists (
    select 1 from public.branches b
    where b.id = diesel_logs.branch_id
      and b.company_id = public.current_company_id()
  ));
drop policy if exists "Company members write diesel_logs" on public.diesel_logs;
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
