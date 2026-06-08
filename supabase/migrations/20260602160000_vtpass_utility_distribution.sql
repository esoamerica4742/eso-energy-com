-- VTpass direct utility vending (Monnify remains wallet-only for Power Shield auto top-up).

alter table public.utility_providers
  add column if not exists vtpass_service_id text,
  add column if not exists vtpass_variation_code text not null default 'prepaid';

comment on column public.utility_providers.vtpass_service_id is
  'VTpass serviceID slug (e.g. abuja-electric, ikeja-electric).';
comment on column public.utility_providers.vtpass_variation_code is
  'VTpass variation_code for prepaid/postpaid (default prepaid).';

alter table public.utility_purchases
  add column if not exists vtpass_request_id text,
  add column if not exists vtpass_transaction_id text,
  add column if not exists fulfillment_provider text;

create unique index if not exists idx_utility_purchases_vtpass_request_id
  on public.utility_purchases(vtpass_request_id)
  where vtpass_request_id is not null;
