-- Eso Pay Bills — low-token / low-wallet threshold webhook audit log.

create table if not exists public.eso_pay_low_token_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_id uuid references public.prepaid_electricity_meters(id) on delete set null,
  channel text not null check (channel in ('wallet', 'token_reserve')),
  tier text not null check (tier in ('warn_10', 'critical')),
  fingerprint text not null,
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz not null default now(),
  unique (fingerprint)
);

create index if not exists idx_low_token_webhook_user_delivered
  on public.eso_pay_low_token_webhook_deliveries(user_id, delivered_at desc);

alter table public.eso_pay_low_token_webhook_deliveries enable row level security;

drop policy if exists "Users read own low token webhooks" on public.eso_pay_low_token_webhook_deliveries;
create policy "Users read own low token webhooks"
  on public.eso_pay_low_token_webhook_deliveries
  for select
  to authenticated
  using (user_id = auth.uid());
