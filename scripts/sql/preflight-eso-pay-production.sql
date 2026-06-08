-- =============================================================================
-- ESO Pay + legacy payments — READ-ONLY preflight (production Supabase)
-- =============================================================================
--
-- Safe to run anytime. Makes no changes.
--
-- Run in: Supabase Dashboard → SQL → New query
-- Or:     psql "$DATABASE_URL" -f scripts/sql/preflight-eso-pay-production.sql
--
-- If objects are listed below, run teardown only after review:
--   scripts/sql/teardown-eso-pay-production.sql
--
-- =============================================================================

-- ─── Summary counts ─────────────────────────────────────────────────────────

with targets as (
  select tablename as name
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
        'company_wallets',
        'saved_meters',
        'saved_decoders',
        'eso_referrals',
        'eso_credit_scores',
        'eso_payments'
      )
    )
),
target_funcs as (
  select p.proname as name
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
),
target_triggers as (
  select t.tgname as name
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace n on n.oid = p.pronamespace
  where t.tgrelid = 'auth.users'::regclass
    and not t.tgisinternal
    and n.nspname = 'public'
    and (p.proname like 'eso_pay%' or t.tgname like '%eso_pay%')
),
realtime_hits as (
  select c.relname as name
  from pg_publication_rel pr
  join pg_publication pub on pub.oid = pr.prprpubid
  join pg_class c on c.oid = pr.prrelid
  join pg_namespace n on n.oid = c.relnamespace
  where pub.pubname = 'supabase_realtime'
    and n.nspname = 'public'
    and c.relname in ('grid_utility_accounts', 'grid_ledger_entries')
)
select
  (select count(*) from targets) as payment_tables,
  (select count(*) from target_funcs) as payment_functions,
  (select count(*) from target_triggers) as auth_user_triggers,
  (select count(*) from realtime_hits) as realtime_publication_tables,
  case
    when (select count(*) from targets)
       + (select count(*) from target_funcs)
       + (select count(*) from target_triggers) = 0
    then 'clean — nothing to teardown'
    else 'action needed — review details below'
  end as status;

-- ─── Tables ─────────────────────────────────────────────────────────────────

select
  'table' as kind,
  t.tablename as name,
  coalesce(s.n_live_tup, 0)::bigint as approx_rows
from pg_tables t
left join pg_stat_user_tables s
  on s.schemaname = t.schemaname and s.relname = t.tablename
where t.schemaname = 'public'
  and (
    t.tablename like 'eso_pay%'
    or t.tablename like 'eso_%'
    or t.tablename in (
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
      'company_wallets',
      'saved_meters',
      'saved_decoders',
      'eso_referrals',
      'eso_credit_scores',
      'eso_payments'
    )
  )
order by t.tablename;

-- ─── Functions ──────────────────────────────────────────────────────────────

select
  'function' as kind,
  p.proname as name,
  pg_get_function_identity_arguments(p.oid) as signature
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
order by p.proname, signature;

-- ─── Triggers on auth.users ─────────────────────────────────────────────────

select
  'trigger' as kind,
  t.tgname as name,
  p.proname as function_name
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal
  and n.nspname = 'public'
  and (p.proname like 'eso_pay%' or t.tgname like '%eso_pay%')
order by t.tgname;

-- ─── Realtime publication ───────────────────────────────────────────────────

select
  'realtime' as kind,
  c.relname as table_name
from pg_publication_rel pr
join pg_publication pub on pub.oid = pr.prprpubid
join pg_class c on c.oid = pr.prrelid
join pg_namespace n on n.oid = c.relnamespace
where pub.pubname = 'supabase_realtime'
  and n.nspname = 'public'
  and c.relname in ('grid_utility_accounts', 'grid_ledger_entries')
order by c.relname;

-- ─── Push notification events (payment-related) ───────────────────────────

select
  'push_event' as kind,
  event_type as name,
  count(*)::bigint as rows
from public.push_notification_events
where event_type in ('low_grid_balance', 'esopay_alert', 'eso_pay_alert')
group by event_type
order by event_type;

-- ─── Eso Pay auth users (informational) ───────────────────────────────────

do $$
declare
  cnt bigint;
begin
  if to_regclass('public.eso_users') is null then
    raise notice 'eso_users: table not present';
    return;
  end if;

  execute 'select count(*) from public.eso_users' into cnt;
  raise notice 'eso_users rows: %', cnt;

  execute $q$
    select count(*) from public.eso_users eu
    join auth.users u on u.id = eu.user_id
    left join public.profiles p on p.id = u.id
    where p.company_id is null
  $q$ into cnt;
  raise notice 'eso_users without inverter company_id: %', cnt;
end $$;

-- Optional detail (run manually if eso_users exists):
-- select u.id, u.email, u.phone, u.created_at, p.company_id
-- from public.eso_users eu
-- join auth.users u on u.id = eu.user_id
-- left join public.profiles p on p.id = u.id
-- order by u.created_at desc
-- limit 50;
