-- Remove ESO Pay site-fleet intelligence tables (fleet monitoring lives in main app, not Eso Pay)

drop table if exists public.intelligence_notification_log cascade;
drop table if exists public.intelligence_snooze_events cascade;
drop table if exists public.intelligence_recharge_events cascade;
drop table if exists public.intelligence_meter_snapshots cascade;
drop table if exists public.intelligence_meters cascade;
