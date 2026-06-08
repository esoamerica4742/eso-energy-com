-- Power Shield v2 — scheduled alert timestamps + burn confidence metadata.

alter table public.prepaid_electricity_meters
  add column if not exists alert_schedule_48h_at timestamptz,
  add column if not exists alert_schedule_24h_at timestamptz,
  add column if not exists alert_schedule_6h_at timestamptz,
  add column if not exists burn_confidence text
    check (burn_confidence is null or burn_confidence in ('high', 'medium', 'low')),
  add column if not exists daily_spend_source text
    check (daily_spend_source is null or daily_spend_source in ('user', 'learned', 'estimated_single', 'inferred_default'));

create index if not exists idx_prepaid_meters_alert_48h
  on public.prepaid_electricity_meters(alert_schedule_48h_at)
  where alert_schedule_48h_at is not null;

create index if not exists idx_prepaid_meters_alert_24h
  on public.prepaid_electricity_meters(alert_schedule_24h_at)
  where alert_schedule_24h_at is not null;

create index if not exists idx_prepaid_meters_alert_6h
  on public.prepaid_electricity_meters(alert_schedule_6h_at)
  where alert_schedule_6h_at is not null;
