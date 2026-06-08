-- Volume-percentage Power Shield (kWh batch from last Monnify vend)

alter table public.prepaid_electricity_meters
  add column if not exists last_purchase_total_kwh numeric(12, 3),
  add column if not exists learned_daily_kwh numeric(12, 3),
  add column if not exists user_daily_kwh numeric(12, 3);

comment on column public.prepaid_electricity_meters.last_purchase_total_kwh is
  'Total kWh vended in the last successful Monnify electricity purchase (parsed or inferred).';
comment on column public.prepaid_electricity_meters.learned_daily_kwh is
  'Weighted daily kWh burn learned from purchase intervals.';
comment on column public.prepaid_electricity_meters.user_daily_kwh is
  'User override for average daily kWh consumption.';
