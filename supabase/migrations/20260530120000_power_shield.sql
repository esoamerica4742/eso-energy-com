-- Power Shield — prepaid electricity token depletion tracking + blackout alerts.

create table if not exists public.prepaid_electricity_meters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  utility_provider_id uuid not null references public.utility_providers(id),
  account_number text not null,
  label text not null default 'My meter',
  daily_spend_kobo bigint check (daily_spend_kobo is null or daily_spend_kobo > 0),
  learned_daily_spend_kobo bigint check (learned_daily_spend_kobo is null or learned_daily_spend_kobo > 0),
  last_purchase_amount_kobo bigint check (last_purchase_amount_kobo is null or last_purchase_amount_kobo > 0),
  last_purchase_at timestamptz,
  last_token_or_receipt text,
  estimated_depletion_at timestamptz,
  notify_48h boolean not null default true,
  notify_24h boolean not null default true,
  notify_6h boolean not null default true,
  last_alert_48h_at timestamptz,
  last_alert_24h_at timestamptz,
  last_alert_6h_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, utility_provider_id, account_number)
);

create index if not exists idx_prepaid_meters_user on public.prepaid_electricity_meters(user_id);
create index if not exists idx_prepaid_meters_depletion
  on public.prepaid_electricity_meters(estimated_depletion_at)
  where estimated_depletion_at is not null;

create table if not exists public.eso_pay_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  app_version text not null default '1.0.0',
  power_shield_enabled boolean not null default true,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (expo_push_token)
);

create index if not exists idx_eso_pay_push_tokens_user
  on public.eso_pay_push_tokens(user_id, enabled, power_shield_enabled);

drop trigger if exists prepaid_electricity_meters_set_updated_at on public.prepaid_electricity_meters;
create trigger prepaid_electricity_meters_set_updated_at
  before update on public.prepaid_electricity_meters
  for each row execute function public.set_updated_at();

drop trigger if exists eso_pay_push_tokens_set_updated_at on public.eso_pay_push_tokens;
create trigger eso_pay_push_tokens_set_updated_at
  before update on public.eso_pay_push_tokens
  for each row execute function public.set_updated_at();

alter table public.prepaid_electricity_meters enable row level security;
alter table public.eso_pay_push_tokens enable row level security;

drop policy if exists "Users manage own prepaid meters" on public.prepaid_electricity_meters;
create policy "Users manage own prepaid meters"
  on public.prepaid_electricity_meters
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users manage own eso pay push tokens" on public.eso_pay_push_tokens;
create policy "Users manage own eso pay push tokens"
  on public.eso_pay_push_tokens
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
