-- Electricity VTpass/Monnify fail-safe: queue token delivery when DisCo is down.

alter table public.utility_purchases
  drop constraint if exists utility_purchases_status_check;

alter table public.utility_purchases
  add constraint utility_purchases_status_check
  check (status in (
    'pending',
    'processing',
    'success',
    'failed',
    'reversed',
    'pending_fulfillment'
  ));

alter table public.utility_purchases
  add column if not exists fulfillment_queued_at timestamptz,
  add column if not exists fulfillment_attempts int not null default 0,
  add column if not exists fulfillment_next_attempt_at timestamptz;

create index if not exists idx_utility_purchases_pending_fulfillment
  on public.utility_purchases(fulfillment_next_attempt_at)
  where status = 'pending_fulfillment';
