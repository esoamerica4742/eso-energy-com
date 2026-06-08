-- =============================================================================
-- ESO Pay + legacy payments teardown (production Supabase)
-- =============================================================================
--
-- Run in: Supabase Dashboard → SQL → New query
-- Or:     psql "$DATABASE_URL" -f scripts/sql/teardown-eso-pay-production.sql
--
-- ⚠️  DESTRUCTIVE — backs up nothing. Review the preflight section first.
-- ⚠️  Does NOT delete auth.users rows (optional section at bottom).
--
-- Read-only check first (recommended):
--   scripts/sql/preflight-eso-pay-production.sql
--
-- After this script, also manually:
--   1. Undeploy edge functions (if still live):
--        eso-pay-api, eso-pay-cron-intelligence, eso-pay-cron-schedules,
--        payments-api, monnify-webhook
--   2. Remove secrets: ESO_PAY_PIN_SALT, ESO_PAY_CRON_SECRET, MONNIFY_*
--
-- =============================================================================

-- ─── 1. Preflight: what exists? ─────────────────────────────────────────────

select 'tables' as kind, tablename as name
from pg_tables
where schemaname = 'public'
  and (
    tablename like 'eso_pay%'
    or tablename like 'eso_%'
    or tablename in (
      'eso_users',
      'user_pins',
      'user_wallets',
      'wallet_transactions',
      'payment_schedules',
      'payment_intents',
      'grid_utility_accounts',
      'grid_ledger_entries',
      'utility_transactions',
      'utility_providers',
      'bill_providers',
      'company_wallets'
    )
  )
order by tablename;

select 'functions' as kind, p.proname as name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname like 'eso_pay%'
    or p.proname like 'record_esopay%'
    or p.proname in (
      'record_esopay_wallet_funding',
      'record_wallet_funding',
      'record_grid_ledger_entry'
    )
  )
order by p.proname;

-- Uncomment to abort if nothing matched:
-- \echo 'Review output above before continuing'

-- ─── 2. Realtime publication cleanup ────────────────────────────────────────

do $$
begin
  alter publication supabase_realtime drop table public.grid_utility_accounts;
exception
  when undefined_object then null;
  when undefined_table then null;
end $$;

do $$
begin
  alter publication supabase_realtime drop table public.grid_ledger_entries;
exception
  when undefined_object then null;
  when undefined_table then null;
end $$;

-- ─── 3. Triggers on auth.users (Eso Pay signup hook) ────────────────────────

do $$
declare
  r record;
begin
  for r in
    select t.tgname
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and n.nspname = 'public'
      and (
        p.proname like 'eso_pay%'
        or t.tgname like '%eso_pay%'
      )
  loop
    execute format('drop trigger if exists %I on auth.users', r.tgname);
  end loop;
end $$;

-- ─── 4. RPC / helper functions ──────────────────────────────────────────────

drop function if exists public.record_esopay_wallet_funding(uuid, numeric, text, text);
drop function if exists public.record_esopay_wallet_funding(uuid, numeric, text, text, text);
drop function if exists public.record_wallet_funding(uuid, numeric, text, text, text, text);
drop function if exists public.record_wallet_funding(uuid, numeric, numeric, text, text, text);
drop function if exists public.record_grid_ledger_entry(uuid, numeric, text, text, jsonb);
drop function if exists public.eso_pay_generate_referral_code();
drop function if exists public.eso_pay_handle_new_user();

-- Catch any remaining public functions matching eso_pay / record_esopay
do $$
declare
  r record;
begin
  for r in
    select pg_get_function_identity_arguments(p.oid) as args, p.proname as name
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'eso_pay%' or p.proname like 'record_esopay%')
  loop
    execute format('drop function if exists public.%I(%s) cascade', r.name, r.args);
  end loop;
end $$;

-- ─── 5. Drop tables (children → parents) ────────────────────────────────────
-- Explicit list from removed migrations:
--   20260524120000_eso_pay.sql
--   20260524130000_eso_pay_auto_recharge_fields.sql
--   20260524140000_eso_pay_funding_intents.sql
--   20260521120000_grid_utility_ledger.sql
--   20260523140000_payments_monnify.sql
--   20260523150000_utility_fulfillment.sql

drop table if exists public.eso_pay_funding_intents cascade;
drop table if exists public.wallet_transactions cascade;
drop table if exists public.eso_payments cascade;
drop table if exists public.payment_schedules cascade;
drop table if exists public.utility_transactions cascade;
drop table if exists public.grid_ledger_entries cascade;
drop table if exists public.payment_intents cascade;
drop table if exists public.user_pins cascade;
drop table if exists public.user_wallets cascade;
drop table if exists public.eso_users cascade;
drop table if exists public.eso_pay_config cascade;
drop table if exists public.grid_utility_accounts cascade;
drop table if exists public.bill_providers cascade;
drop table if exists public.eso_bill_providers cascade;
drop table if exists public.company_wallets cascade;
drop table if exists public.utility_providers cascade;
drop table if exists public.saved_meters cascade;
drop table if exists public.saved_decoders cascade;
drop table if exists public.eso_referrals cascade;
drop table if exists public.eso_credit_scores cascade;

-- Any leftover public tables prefixed eso_pay_
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename like 'eso_pay%'
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
end $$;

-- ─── 6. Orphaned push notification rows (grid wallet alerts) ─────────────────

delete from public.push_notification_events
where event_type in ('low_grid_balance', 'esopay_alert', 'eso_pay_alert');

-- ─── 7. Post-check ──────────────────────────────────────────────────────────

select 'remaining_tables' as check, tablename as name
from pg_tables
where schemaname = 'public'
  and (
    tablename like 'eso_pay%'
    or tablename in (
      'eso_users', 'user_pins', 'user_wallets', 'wallet_transactions',
      'payment_schedules', 'payment_intents', 'grid_utility_accounts',
      'grid_ledger_entries', 'utility_transactions'
    )
  );

select 'remaining_functions' as check, p.proname as name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname like 'eso_pay%' or p.proname like 'record_esopay%');

-- ─── 8. OPTIONAL: remove auth users that only had Eso Pay profiles ─────────
-- ⚠️  Only run after verifying eso_users is empty / dropped.
-- ⚠️  Do NOT run if those emails are shared with inverter monitoring users.
--
-- delete from auth.users u
-- where exists (
--   select 1
--   from auth.identities i
--   where i.user_id = u.id
-- )
-- and not exists (
--   select 1 from public.profiles p
--   where p.id = u.id and p.company_id is not null
-- );
