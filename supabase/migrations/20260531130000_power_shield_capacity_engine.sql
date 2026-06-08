-- Power Shield v3 — capacity thresholds (10% / 5%) + auto top-up + grid ledger audit.

alter table public.prepaid_electricity_meters
  add column if not exists auto_top_up_enabled boolean not null default false,
  add column if not exists capacity_remaining_pct numeric(6, 2),
  add column if not exists alert_state text not null default 'safe'
    check (alert_state in ('safe', 'warn_10', 'critical', 'expired', 'unknown')),
  add column if not exists auto_top_up_execute_at timestamptz,
  add column if not exists notify_warn_10 boolean,
  add column if not exists notify_critical_5 boolean,
  add column if not exists last_alert_warn_10_at timestamptz,
  add column if not exists last_alert_critical_5_at timestamptz;

update public.prepaid_electricity_meters
set
  notify_warn_10 = coalesce(notify_warn_10, notify_48h, true),
  notify_critical_5 = coalesce(notify_critical_5, notify_6h, true)
where notify_warn_10 is null or notify_critical_5 is null;

alter table public.prepaid_electricity_meters
  alter column notify_warn_10 set default true,
  alter column notify_critical_5 set default true;

create table if not exists public.grid_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_id uuid references public.prepaid_electricity_meters(id) on delete set null,
  entry_type text not null check (
    entry_type in (
      'capacity_alert',
      'auto_top_up_scheduled',
      'auto_top_up_success',
      'auto_top_up_failed',
      'token_credit'
    )
  ),
  amount_kobo bigint,
  capacity_pct numeric(6, 2),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_grid_ledger_user_created
  on public.grid_ledger_entries(user_id, created_at desc);

create index if not exists idx_prepaid_meters_auto_top_up
  on public.prepaid_electricity_meters(auto_top_up_execute_at)
  where auto_top_up_execute_at is not null;

alter table public.grid_ledger_entries enable row level security;

drop policy if exists "Users read own grid ledger" on public.grid_ledger_entries;
create policy "Users read own grid ledger"
  on public.grid_ledger_entries
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.record_grid_ledger_entry(
  p_user_id uuid,
  p_meter_id uuid,
  p_entry_type text,
  p_amount_kobo bigint,
  p_capacity_pct numeric,
  p_message text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.grid_ledger_entries (
    user_id,
    meter_id,
    entry_type,
    amount_kobo,
    capacity_pct,
    message,
    metadata
  )
  values (
    p_user_id,
    p_meter_id,
    p_entry_type,
    p_amount_kobo,
    p_capacity_pct,
    p_message,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.record_grid_ledger_entry(uuid, uuid, text, bigint, numeric, text, jsonb)
  to service_role;
