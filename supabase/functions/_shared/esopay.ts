import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  createReservedAccount,
  getReservedAccount,
  inferUtilityCategory,
  isMonnifyConfigured,
  listBillerProducts,
  listBillers,
} from "./monnify.ts";

/** Authenticated Eso Pay session — wallet scope is always the user, not a company. */
export type EsoPayAuthContext = {
  userId: string;
};

export type CompanyWalletRow = {
  id: string;
  company_id: string | null;
  user_id: string | null;
  monnify_wallet_reference: string;
  balance_kobo: number;
  currency: string;
  status: string;
  reserved_account_number: string | null;
  reserved_account_name: string | null;
  reserved_bank_name: string | null;
  reserved_bank_code: string | null;
  monnify_account_reference: string | null;
  updated_at: string;
};

export type UtilityProviderRow = {
  id: string;
  name: string;
  category: string;
  monnify_biller_code: string;
  monnify_product_code: string;
  minimum_amount_kobo: number | null;
  maximum_amount_kobo: number | null;
};

export function walletToApi(row: CompanyWalletRow) {
  const ownerId = row.user_id ?? row.company_id ?? "";
  return {
    user_id: ownerId,
    company_id: ownerId,
    balance_kobo: row.balance_kobo,
    currency: "NGN" as const,
    monnify_wallet_reference: row.monnify_wallet_reference,
    status: row.status as "active" | "pending" | "suspended",
    updated_at: row.updated_at,
  };
}

export function reservedAccountToApi(row: CompanyWalletRow) {
  if (!row.reserved_account_number || !row.monnify_account_reference) {
    throw new Error("Reserved account not provisioned");
  }
  return {
    account_number: row.reserved_account_number,
    account_name: row.reserved_account_name ?? "ESO Pay Wallet",
    bank_name: row.reserved_bank_name ?? "Partner Bank",
    bank_code: row.reserved_bank_code ?? "",
    monnify_account_reference: row.monnify_account_reference,
    currency: "NGN" as const,
  };
}

export async function assertCanPay(
  _supabase: SupabaseClient,
  _userId: string,
): Promise<void> {
  // Individual Eso Pay — any signed-in user may fund and pay utilities.
}

export async function resolveEsoPayAuth(req: Request): Promise<EsoPayAuthContext | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !anonKey) return null;

  const supabaseAnon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !userData.user) return null;

  return { userId: userData.user.id };
}

/** Wallet scope is the authenticated user (legacy headers may still send X-Company-Id). */
export async function resolveWalletUserId(
  req: Request,
  auth: EsoPayAuthContext,
): Promise<string> {
  const header =
    req.headers.get("X-Eso-Pay-User-Id") ??
    req.headers.get("X-Company-Id");
  if (header && header !== auth.userId) {
    const err = new Error("Wallet scope does not match your account") as Error & {
      status?: number;
    };
    err.status = 403;
    throw err;
  }
  return auth.userId;
}

export async function ensureUserWallet(
  supabase: SupabaseClient,
  userId: string,
): Promise<CompanyWalletRow> {
  const { data: existing, error: fetchError } = await supabase
    .from("company_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (existing) return existing as CompanyWalletRow;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const customerEmail =
    profile?.email ?? authUser?.user?.email ?? `wallet+${userId}@eso-energy.local`;
  const customerName = profile?.full_name ??
    authUser?.user?.user_metadata?.full_name ??
    "ESO Pay User";

  const accountReference = `eso-user-${userId}`;

  // Create wallet row immediately; Monnify virtual account is provisioned via
  // GET/POST /wallet/reserved-account so /wallet stays fast and mobile does not spin.
  const insertRow = {
    user_id: userId,
    company_id: null,
    monnify_wallet_reference: accountReference,
    balance_kobo: 0,
    currency: "NGN",
    status: "pending",
    reserved_account_number: null,
    reserved_account_name: null,
    reserved_bank_name: null,
    reserved_bank_code: null,
    monnify_account_reference: accountReference,
  };

  const { data: created, error: insertError } = await supabase
    .from("company_wallets")
    .insert(insertRow)
    .select("*")
    .single();

  if (insertError) {
    const { data: raced } = await supabase
      .from("company_wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (raced) return raced as CompanyWalletRow;
    throw new Error(insertError.message);
  }

  return created as CompanyWalletRow;
}

/** @deprecated Legacy company wallets — use ensureUserWallet for Eso Pay. */
export async function ensureCompanyWallet(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanyWalletRow> {
  const { data: existing, error: fetchError } = await supabase
    .from("company_wallets")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (existing) return existing as CompanyWalletRow;

  const accountReference = `eso-${companyId}`;
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  const companyName = company?.name ?? "ESO Client";
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("company_id", companyId)
    .limit(1)
    .maybeSingle();

  const customerEmail = profile?.email ?? `wallet+${companyId}@eso-energy.local`;
  const customerName = profile?.full_name ?? companyName;

  let reserved;
  try {
    reserved = await createReservedAccount({
      accountReference,
      accountName: `ESO Pay — ${companyName}`.slice(0, 64),
      customerName: customerName.slice(0, 64),
      customerEmail,
    });
  } catch {
    reserved = await getReservedAccount(accountReference);
  }

  const primary = reserved.accounts?.[0];
  const insertRow = {
    company_id: companyId,
    monnify_wallet_reference: accountReference,
    balance_kobo: 0,
    currency: "NGN",
    status: "active",
    reserved_account_number: primary?.accountNumber ?? null,
    reserved_account_name: primary?.accountName ?? reserved.accountName,
    reserved_bank_name: primary?.bankName ?? null,
    reserved_bank_code: primary?.bankCode ?? null,
    monnify_account_reference: reserved.accountReference ?? accountReference,
  };

  const { data: created, error: insertError } = await supabase
    .from("company_wallets")
    .insert(insertRow)
    .select("*")
    .single();

  if (insertError) {
    const { data: raced } = await supabase
      .from("company_wallets")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();
    if (raced) return raced as CompanyWalletRow;
    throw new Error(insertError.message);
  }

  return created as CompanyWalletRow;
}

export async function ensureReservedAccountOnWallet(
  supabase: SupabaseClient,
  wallet: CompanyWalletRow,
  userId: string,
): Promise<CompanyWalletRow> {
  if (!isMonnifyConfigured()) {
    const err = new Error(
      "Monnify is not configured. Set MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE on Supabase.",
    ) as Error & { status?: number; code?: string };
    err.status = 503;
    err.code = "MONNIFY_NOT_CONFIGURED";
    throw err;
  }

  if (wallet.reserved_account_number && wallet.monnify_account_reference) {
    return wallet;
  }

  const accountReference = wallet.monnify_wallet_reference;
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const customerEmail =
    profile?.email ?? authUser?.user?.email ?? `wallet+${userId}@eso-energy.local`;
  const customerName = profile?.full_name ??
    authUser?.user?.user_metadata?.full_name ??
    "ESO Pay User";

  let reserved;
  let createError: unknown;
  try {
    reserved = await createReservedAccount({
      accountReference,
      accountName: `ESO Pay — ${String(customerName).slice(0, 48)}`.slice(0, 64),
      customerName: String(customerName).slice(0, 64),
      customerEmail,
    });
  } catch (err) {
    createError = err;
    try {
      reserved = await getReservedAccount(accountReference);
    } catch {
      const message = err instanceof Error
        ? err.message
        : "Monnify reserved account creation failed";
      const needsKyc = /bvn|nin|kyc/i.test(message);
      const apiErr = new Error(message) as Error & { status?: number; code?: string };
      apiErr.status = 503;
      apiErr.code = needsKyc ? "MONNIFY_KYC_REQUIRED" : "RESERVED_ACCOUNT_UNAVAILABLE";
      throw apiErr;
    }
  }

  const primary = reserved.accounts?.[0];
  if (!primary?.accountNumber) {
    const fallbackMessage = createError instanceof Error
      ? createError.message
      : "Monnify did not return a virtual account number.";
    const needsKyc = /bvn|nin|kyc/i.test(fallbackMessage);
    const err = new Error(
      needsKyc
        ? `${fallbackMessage} Set MONNIFY_SANDBOX_BVN (11 digits) on Supabase for sandbox, redeploy eso-pay-api, then try again.`
        : `${fallbackMessage} Check MONNIFY_* secrets and contract code on Supabase.`,
    ) as Error & { status?: number; code?: string };
    err.status = 503;
    err.code = needsKyc ? "MONNIFY_KYC_REQUIRED" : "RESERVED_ACCOUNT_UNAVAILABLE";
    throw err;
  }
  const { data: updated, error } = await supabase
    .from("company_wallets")
    .update({
      reserved_account_number: primary?.accountNumber ?? null,
      reserved_account_name: primary?.accountName ?? reserved.accountName,
      reserved_bank_name: primary?.bankName ?? null,
      reserved_bank_code: primary?.bankCode ?? null,
      monnify_account_reference: reserved.accountReference ?? accountReference,
      status: "active",
    })
    .eq("id", wallet.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return updated as CompanyWalletRow;
}

export async function syncUtilityProviders(
  supabase: SupabaseClient,
): Promise<UtilityProviderRow[]> {
  if (!isMonnifyConfigured()) {
    return fetchUtilityProvidersFromDb(supabase);
  }

  const billers = await listBillers();
  const rows: Array<Record<string, unknown>> = [];

  for (const biller of billers.slice(0, 80)) {
    const products = await listBillerProducts(biller.code);
    for (const product of products) {
      const minKobo = product.minimumAmount != null
        ? Math.round(product.minimumAmount * 100)
        : null;
      const maxKobo = product.maximumAmount != null
        ? Math.round(product.maximumAmount * 100)
        : product.amount != null
        ? Math.round(product.amount * 100)
        : null;
      rows.push({
        name: `${biller.name} — ${product.name}`,
        category: inferUtilityCategory(biller.name, product.name),
        monnify_biller_code: biller.code,
        monnify_product_code: product.code,
        is_active: true,
        minimum_amount_kobo: minKobo,
        maximum_amount_kobo: maxKobo,
        synced_at: new Date().toISOString(),
      });
    }
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from("utility_providers").upsert(rows, {
      onConflict: "monnify_biller_code,monnify_product_code",
    });
    if (upsertError) {
      console.warn("[esopay] utility_providers upsert:", upsertError.message);
    }
  }

  return fetchUtilityProvidersFromDb(supabase);
}

/** Load catalog from DB; seed a local fallback when Monnify sync is empty (sandbox / offline). */
export async function ensureUtilityProvidersCatalog(
  supabase: SupabaseClient,
): Promise<UtilityProviderRow[]> {
  let rows = await fetchUtilityProvidersFromDb(supabase);
  if (rows.length >= 5) return rows;

  if (isMonnifyConfigured()) {
    try {
      rows = await syncUtilityProviders(supabase);
      if (rows.length >= 5) return rows;
    } catch (err) {
      console.warn("[esopay] ensureUtilityProvidersCatalog sync:", err);
    }
  }

  if (rows.length === 0) {
    await seedFallbackUtilityProviders(supabase);
    rows = await fetchUtilityProvidersFromDb(supabase);
  }

  return rows;
}

async function fetchUtilityProvidersFromDb(
  supabase: SupabaseClient,
): Promise<UtilityProviderRow[]> {
  const { data, error } = await supabase
    .from("utility_providers")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as UtilityProviderRow[];
}

const FALLBACK_UTILITY_PROVIDERS: Array<{
  name: string;
  category: UtilityProviderRow["category"];
  monnify_biller_code: string;
  monnify_product_code: string;
}> = [
  { name: "Ikeja Electric (IE)", category: "electricity", monnify_biller_code: "IE", monnify_product_code: "PREPAID" },
  { name: "Eko Electric (EKEDC)", category: "electricity", monnify_biller_code: "EKEDC", monnify_product_code: "PREPAID" },
  { name: "Abuja Electric (AEDC)", category: "electricity", monnify_biller_code: "AEDC", monnify_product_code: "PREPAID" },
  { name: "MTN Airtime", category: "airtime", monnify_biller_code: "MTN", monnify_product_code: "AIRTIME" },
  { name: "Airtel Airtime", category: "airtime", monnify_biller_code: "AIRTEL", monnify_product_code: "AIRTIME" },
  { name: "Glo Airtime", category: "airtime", monnify_biller_code: "GLO", monnify_product_code: "AIRTIME" },
  { name: "MTN Data", category: "data", monnify_biller_code: "MTN", monnify_product_code: "DATA" },
  { name: "DStv", category: "tv", monnify_biller_code: "DSTV", monnify_product_code: "SUBSCRIPTION" },
  { name: "GOtv", category: "tv", monnify_biller_code: "GOTV", monnify_product_code: "SUBSCRIPTION" },
];

async function seedFallbackUtilityProviders(supabase: SupabaseClient): Promise<void> {
  const now = new Date().toISOString();
  const rows = FALLBACK_UTILITY_PROVIDERS.map((row) => ({
    ...row,
    is_active: true,
    synced_at: now,
  }));
  const { error } = await supabase.from("utility_providers").upsert(rows, {
    onConflict: "monnify_biller_code,monnify_product_code",
  });
  if (error) console.warn("[esopay] seedFallbackUtilityProviders:", error.message);
}

export function providersToApi(rows: UtilityProviderRow[]) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: String(row.category).toLowerCase(),
    monnify_biller_code: row.monnify_biller_code,
  }));
}

export async function getUtilityProvider(
  supabase: SupabaseClient,
  providerId: string,
): Promise<UtilityProviderRow | null> {
  const { data, error } = await supabase
    .from("utility_providers")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as UtilityProviderRow | null;
}

export function billRowToApi(row: Record<string, unknown>) {
  return {
    id: row.id,
    company_id: row.company_id,
    site_id: row.site_id,
    utility_provider: row.utility_provider,
    account_number: row.account_number,
    billing_period_start: row.billing_period_start,
    billing_period_end: row.billing_period_end,
    gross_amount_kobo: row.gross_amount_kobo,
    offset_amount_kobo: row.offset_amount_kobo,
    net_amount_kobo: row.net_amount_kobo,
    currency: row.currency ?? "NGN",
    status: row.status,
    due_date: row.due_date,
  };
}

export function walletTransactionToApi(row: Record<string, unknown>) {
  const ownerId = (row.user_id as string | null) ?? (row.company_id as string | null) ?? "";
  return {
    id: row.id,
    user_id: ownerId,
    company_id: ownerId,
    type: row.type,
    amount_kobo: row.amount_kobo,
    balance_after_kobo: row.balance_after_kobo,
    status: row.status,
    monnify_transaction_reference: row.monnify_transaction_reference,
    monnify_payment_reference: row.monnify_payment_reference,
    narration: row.narration,
    created_at: row.created_at,
  };
}

export function billPaymentToApi(row: Record<string, unknown>) {
  return {
    id: row.id,
    bill_id: row.bill_id,
    company_id: row.company_id,
    amount_kobo: row.amount_kobo,
    currency: row.currency ?? "NGN",
    status: row.status,
    monnify_transaction_reference: row.monnify_transaction_reference,
    monnify_payment_reference: row.monnify_payment_reference,
    wallet_transaction_id: row.wallet_transaction_id,
    failure_code: row.failure_code,
    failure_message: row.failure_message,
    initiated_by: row.initiated_by,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing Supabase service configuration");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
