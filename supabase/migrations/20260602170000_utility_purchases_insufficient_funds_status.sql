-- Allow explicit insufficient-funds failure state for Power Shield auto re-vends.

alter table public.utility_purchases
  drop constraint if exists utility_purchases_status_check;

alter table public.utility_purchases
  add constraint utility_purchases_status_check
  check (status in (
    'pending',
    'processing',
    'success',
    'failed',
    'failed_insufficient_funds',
    'reversed',
    'pending_fulfillment'
  ));

