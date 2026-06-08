-- Eso Pay is Monnify-only; retire legacy VTpass routing columns.

drop index if exists public.idx_utility_purchases_vtpass_request_id;

alter table public.utility_providers
  drop column if exists vtpass_service_id,
  drop column if exists vtpass_variation_code;

alter table public.utility_purchases
  drop column if exists vtpass_request_id,
  drop column if exists vtpass_transaction_id;
