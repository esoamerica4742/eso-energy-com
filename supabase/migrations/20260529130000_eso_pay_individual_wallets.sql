-- Eso Pay individual wallets — one Monnify wallet per auth user (not per company).

alter table public.company_wallets
  alter column company_id drop not null;

alter table public.company_wallets
  add column if not exists user_id uuid unique references auth.users(id) on delete cascade;

create index if not exists idx_company_wallets_user_id on public.company_wallets(user_id);

alter table public.company_wallets
  drop constraint if exists company_wallets_owner_check;

alter table public.company_wallets
  add constraint company_wallets_owner_check check (
    company_id is not null or user_id is not null
  );

alter table public.wallet_transactions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_wallet_transactions_user_id on public.wallet_transactions(user_id);

alter table public.utility_purchases
  alter column company_id drop not null;

alter table public.utility_purchases
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_utility_purchases_user_id on public.utility_purchases(user_id);

alter table public.eso_pay_funding_intents
  alter column company_id drop not null;

alter table public.eso_pay_funding_intents
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.monnify_bill_payments
  alter column company_id drop not null;

alter table public.monnify_bill_payments
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_monnify_bill_payments_user_id on public.monnify_bill_payments(user_id);

-- Wallet RPCs: resolve wallet by user_id first, then company_id (legacy).

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
  where user_id = p_company_id or company_id = p_company_id
  limit 1
  for update;

  if not found then
    raise exception 'wallet not found for scope %', p_company_id;
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
    company_id, user_id, wallet_id, type, amount_kobo, balance_after_kobo, status,
    monnify_transaction_reference, monnify_payment_reference, narration, metadata
  ) values (
    v_wallet.company_id,
    v_wallet.user_id,
    v_wallet.id,
    'credit',
    p_amount_kobo,
    v_new_balance,
    'success',
    p_monnify_tx_ref,
    p_monnify_payment_ref,
    p_narration,
    p_metadata
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

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
  where user_id = p_company_id or company_id = p_company_id
  limit 1
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
    company_id, user_id, wallet_id, type, amount_kobo, balance_after_kobo, status,
    monnify_payment_reference, narration, metadata, idempotency_key
  ) values (
    v_wallet.company_id,
    v_wallet.user_id,
    v_wallet.id,
    coalesce(p_type, 'debit'),
    p_amount_kobo,
    v_new_balance,
    'success',
    p_monnify_payment_ref,
    p_narration,
    p_metadata,
    p_idempotency_key
  )
  returning * into v_tx;

  return v_tx;
end;
$$;

-- RLS: individuals see their own wallet (monitoring company wallets unchanged).

drop policy if exists "Users view own eso pay wallet" on public.company_wallets;
create policy "Users view own eso pay wallet"
  on public.company_wallets for select to authenticated
  using (
    user_id = auth.uid()
    or company_id = public.current_company_id()
  );

drop policy if exists "Users view own wallet transactions" on public.wallet_transactions;
create policy "Users view own wallet transactions"
  on public.wallet_transactions for select to authenticated
  using (
    user_id = auth.uid()
    or company_id = public.current_company_id()
  );

drop policy if exists "Users view own utility purchases" on public.utility_purchases;
create policy "Users view own utility purchases"
  on public.utility_purchases for select to authenticated
  using (
    user_id = auth.uid()
    or initiated_by = auth.uid()
    or company_id = public.current_company_id()
  );
