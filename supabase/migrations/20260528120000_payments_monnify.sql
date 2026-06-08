-- Eso Pay — Monnify wallet, bills, utility catalog, ledger (production)

-- ─── Company wallets ─────────────────────────────────────────────────────────

create table if not exists public.company_wallets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  monnify_wallet_reference text not null unique,
  balance_kobo bigint not null default 0 check (balance_kobo >= 0),
  currency char(3) not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended')),
  reserved_account_number text,
  reserved_account_name text,
  reserved_bank_name text,
  reserved_bank_code text,
  monnify_account_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_wallets_company_id on public.company_wallets(company_id);
create index if not exists idx_company_wallets_monnify_ref on public.company_wallets(monnify_wallet_reference);

-- ─── Wallet ledger ───────────────────────────────────────────────────────────

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  wallet_id uuid not null references public.company_wallets(id) on delete cascade,
  type text not null check (type in ('credit', 'debit', 'bill_payment', 'refund', 'reversal')),
  amount_kobo bigint not null check (amount_kobo > 0),
  balance_after_kobo bigint,
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  monnify_transaction_reference text unique,
  monnify_payment_reference text,
  narration text,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_transactions_company_id on public.wallet_transactions(company_id);
create index if not exists idx_wallet_transactions_wallet_id on public.wallet_transactions(wallet_id);
create index if not exists idx_wallet_transactions_monnify_tx_ref on public.wallet_transactions(monnify_transaction_reference);
create index if not exists idx_wallet_transactions_payment_ref on public.wallet_transactions(monnify_payment_reference);
create index if not exists idx_wallet_transactions_created_at on public.wallet_transactions(created_at desc);

-- ─── Bills + offsets ─────────────────────────────────────────────────────────

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete restrict,
  utility_provider text not null,
  account_number text not null,
  billing_period_start timestamptz not null,
  billing_period_end timestamptz not null,
  gross_amount_kobo bigint not null check (gross_amount_kobo >= 0),
  offset_amount_kobo bigint not null default 0 check (offset_amount_kobo >= 0),
  net_amount_kobo bigint generated always as (gross_amount_kobo - offset_amount_kobo) stored,
  currency char(3) not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'offset_calculated', 'payment_initiated', 'paid', 'overdue', 'void')),
  due_date timestamptz not null,
  invoice_pdf_url text,
  raw_meter_reading_kwh numeric(12, 4),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bills_company_id on public.bills(company_id);
create index if not exists idx_bills_status on public.bills(status);
create index if not exists idx_bills_due_date on public.bills(due_date);
create index if not exists idx_bills_company_period on public.bills(company_id, billing_period_start, billing_period_end);

create table if not exists public.inverter_offsets (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  inverter_id text not null,
  inverter_serial text not null,
  generation_kwh numeric(12, 4) not null check (generation_kwh >= 0),
  offset_kwh numeric(12, 4) not null check (offset_kwh >= 0),
  tariff_rate_per_kwh numeric(10, 4) not null,
  offset_value_kobo bigint not null,
  offset_percentage numeric(5, 2) not null check (offset_percentage between 0 and 100),
  calculation_method text not null default 'net_metering',
  data_source text not null default 'telemetry',
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),
  unique (bill_id, inverter_id)
);

create index if not exists idx_inverter_offsets_bill_id on public.inverter_offsets(bill_id);
create index if not exists idx_inverter_offsets_company_id on public.inverter_offsets(company_id);

-- ─── Monnify bill settlements ────────────────────────────────────────────────

create table if not exists public.monnify_bill_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete cascade,
  wallet_transaction_id uuid references public.wallet_transactions(id),
  monnify_payment_reference text not null unique,
  monnify_transaction_reference text unique,
  monnify_biller_code text not null,
  customer_account_number text not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  currency char(3) not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'success', 'failed', 'reversed')),
  failure_code text,
  failure_message text,
  idempotency_key text not null unique,
  initiated_by uuid not null references auth.users(id),
  webhook_received_at timestamptz,
  token_or_receipt text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_monnify_bill_payments_bill_id on public.monnify_bill_payments(bill_id);
create index if not exists idx_monnify_bill_payments_company_id on public.monnify_bill_payments(company_id);

-- ─── Ad-hoc utility purchases (Quick Pay) ────────────────────────────────────

create table if not exists public.utility_purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  utility_provider_id uuid not null,
  account_number text not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  currency char(3) not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'success', 'failed', 'reversed')),
  monnify_payment_reference text not null unique,
  monnify_transaction_reference text unique,
  wallet_transaction_id uuid references public.wallet_transactions(id),
  token_or_receipt text,
  failure_code text,
  failure_message text,
  idempotency_key text not null unique,
  initiated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_utility_purchases_company_id on public.utility_purchases(company_id);

-- ─── Funding intents ─────────────────────────────────────────────────────────

create table if not exists public.eso_pay_funding_intents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  amount_kobo bigint not null check (amount_kobo > 0),
  reserved_account_reference text not null,
  idempotency_key text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'fulfilled', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  fulfilled_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Utility catalog (synced from Monnify) ───────────────────────────────────

create table if not exists public.utility_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'other'
    check (category in ('electricity', 'airtime', 'water', 'tv', 'data', 'other')),
  monnify_biller_code text not null,
  monnify_product_code text not null,
  is_active boolean not null default true,
  minimum_amount_kobo bigint,
  maximum_amount_kobo bigint,
  synced_at timestamptz not null default now(),
  unique (monnify_biller_code, monnify_product_code)
);

create index if not exists idx_utility_providers_category on public.utility_providers(category);
create index if not exists idx_utility_providers_biller on public.utility_providers(monnify_biller_code);

-- ─── updated_at triggers ─────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bills_set_updated_at on public.bills;
create trigger bills_set_updated_at
  before update on public.bills
  for each row execute function public.set_updated_at();

drop trigger if exists company_wallets_set_updated_at on public.company_wallets;
create trigger company_wallets_set_updated_at
  before update on public.company_wallets
  for each row execute function public.set_updated_at();

-- ─── Wallet credit (webhook-safe, idempotent) ────────────────────────────────

create or replace function public.esopay_credit_wallet(
  p_company_id uuid,
  p_amount_kobo bigint,
  p_monnify_tx_ref text,
  p_monnify_payment_ref text default null,
  p_narration text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.company_wallets;
  v_tx public.wallet_transactions;
  v_new_balance bigint;
begin
  if p_amount_kobo <= 0 then
    raise exception 'amount must be positive';
  end if;

  select * into v_wallet
  from public.company_wallets
  where company_id = p_company_id
  for update;

  if not found then
    raise exception 'wallet not found for company %', p_company_id;
  end if;

  if p_monnify_tx_ref is not null then
    select * into v_tx
    from public.wallet_transactions
    where monnify_transaction_reference = p_monnify_tx_ref;

    if found then
      return v_tx;
    end if;
  end if;

  v_new_balance := v_wallet.balance_kobo + p_amount_kobo;

  update public.company_wallets
  set balance_kobo = v_new_balance,
      status = 'active',
      updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions (
    company_id, wallet_id, type, amount_kobo, balance_after_kobo, status,
    monnify_transaction_reference, monnify_payment_reference, narration, metadata
  ) values (
    p_company_id, v_wallet.id, 'credit', p_amount_kobo, v_new_balance, 'success',
    p_monnify_tx_ref, p_monnify_payment_ref, p_narration, p_metadata
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

-- ─── Wallet debit (payments) ─────────────────────────────────────────────────

create or replace function public.esopay_debit_wallet(
  p_company_id uuid,
  p_amount_kobo bigint,
  p_type text,
  p_monnify_payment_ref text,
  p_narration text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns public.wallet_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.company_wallets;
  v_tx public.wallet_transactions;
  v_new_balance bigint;
begin
  if p_amount_kobo <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_idempotency_key is not null then
    select * into v_tx from public.wallet_transactions where idempotency_key = p_idempotency_key;
    if found then return v_tx; end if;
  end if;

  select * into v_wallet
  from public.company_wallets
  where company_id = p_company_id
  for update;

  if not found then
    raise exception 'wallet not found';
  end if;

  if v_wallet.balance_kobo < p_amount_kobo then
    raise exception 'insufficient wallet balance' using errcode = 'P0001';
  end if;

  v_new_balance := v_wallet.balance_kobo - p_amount_kobo;

  update public.company_wallets
  set balance_kobo = v_new_balance, updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions (
    company_id, wallet_id, type, amount_kobo, balance_after_kobo, status,
    monnify_payment_reference, narration, metadata, idempotency_key
  ) values (
    p_company_id, v_wallet.id, coalesce(p_type, 'debit'), p_amount_kobo, v_new_balance, 'success',
    p_monnify_payment_ref, p_narration, p_metadata, p_idempotency_key
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

grant execute on function public.esopay_credit_wallet(uuid, bigint, text, text, text, jsonb) to service_role;
grant execute on function public.esopay_debit_wallet(uuid, bigint, text, text, text, jsonb, text) to service_role;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.company_wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.bills enable row level security;
alter table public.inverter_offsets enable row level security;
alter table public.monnify_bill_payments enable row level security;
alter table public.utility_purchases enable row level security;
alter table public.eso_pay_funding_intents enable row level security;
alter table public.utility_providers enable row level security;

drop policy if exists "Members view company wallet" on public.company_wallets;
create policy "Members view company wallet"
  on public.company_wallets for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Members view wallet transactions" on public.wallet_transactions;
create policy "Members view wallet transactions"
  on public.wallet_transactions for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Members view bills" on public.bills;
create policy "Members view bills"
  on public.bills for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Members view inverter offsets" on public.inverter_offsets;
create policy "Members view inverter offsets"
  on public.inverter_offsets for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Members view bill payments" on public.monnify_bill_payments;
create policy "Members view bill payments"
  on public.monnify_bill_payments for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Members view utility purchases" on public.utility_purchases;
create policy "Members view utility purchases"
  on public.utility_purchases for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Members view funding intents" on public.eso_pay_funding_intents;
create policy "Members view funding intents"
  on public.eso_pay_funding_intents for select to authenticated
  using (company_id = public.current_company_id());

drop policy if exists "Authenticated users view utility catalog" on public.utility_providers;
create policy "Authenticated users view utility catalog"
  on public.utility_providers for select to authenticated
  using (is_active = true);
