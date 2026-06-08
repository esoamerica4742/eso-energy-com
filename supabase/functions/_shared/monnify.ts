/**
 * Monnify API client (server-side only).
 * Docs: https://developers.monnify.com
 */

export type MonnifyEnvelope<T> = {
  requestSuccessful: boolean;
  responseMessage: string;
  responseCode?: string;
  responseBody: T;
};

export type MonnifyAuthBody = {
  accessToken: string;
  expiresIn: number;
};

export type MonnifyReservedAccountBody = {
  accountReference: string;
  accountName: string;
  currencyCode: string;
  customerEmail: string;
  customerName: string;
  accounts: Array<{
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankName: string;
  }>;
  reservationReference?: string;
  status?: string;
};

export type MonnifyBillerCategory = {
  name: string;
  code: string;
};

export type MonnifyBiller = {
  name: string;
  code: string;
  type?: string;
  categoryCode?: string;
};

export type MonnifyBillerProduct = {
  name: string;
  code: string;
  billerCode?: string;
  amount?: number;
  minimumAmount?: number;
  maximumAmount?: number;
  requiresValidation?: boolean;
};

export type MonnifyValidateCustomerBody = {
  validationReference?: string;
  customerName?: string;
  minimumAmount?: number;
  maximumAmount?: number;
  requiresValidationRef?: boolean;
};

export type MonnifyPayBillBody = {
  transactionReference?: string;
  paymentReference?: string;
  rechargeToken?: string;
  status?: string;
};

let tokenCache: { token: string; expiresAt: number } | null = null;

export function getMonnifyBaseUrl(): string {
  const env = (Deno.env.get("MONNIFY_ENV") ?? "sandbox").toLowerCase();
  if (env === "live" || env === "production") {
    return Deno.env.get("MONNIFY_BASE_URL") ?? "https://api.monnify.com";
  }
  return Deno.env.get("MONNIFY_BASE_URL") ?? "https://sandbox.monnify.com";
}

export function isMonnifyConfigured(): boolean {
  return Boolean(
    Deno.env.get("MONNIFY_API_KEY")?.trim() &&
      Deno.env.get("MONNIFY_SECRET_KEY")?.trim() &&
      Deno.env.get("MONNIFY_CONTRACT_CODE")?.trim(),
  );
}

function requireMonnifyConfig(): { apiKey: string; secretKey: string; contractCode: string } {
  const apiKey = Deno.env.get("MONNIFY_API_KEY") ?? "";
  const secretKey = Deno.env.get("MONNIFY_SECRET_KEY") ?? "";
  const contractCode = Deno.env.get("MONNIFY_CONTRACT_CODE") ?? "";
  if (!apiKey || !secretKey || !contractCode) {
    throw new Error(
      "Monnify is not configured. Set MONNIFY_API_KEY, MONNIFY_SECRET_KEY, and MONNIFY_CONTRACT_CODE on Supabase.",
    );
  }
  return { apiKey, secretKey, contractCode };
}

export async function getMonnifyAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.token;
  }

  const { apiKey, secretKey } = requireMonnifyConfig();
  const credentials = btoa(`${apiKey}:${secretKey}`);
  const res = await fetch(`${getMonnifyBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(MONNIFY_FETCH_MS),
  });

  const json = (await res.json()) as MonnifyEnvelope<MonnifyAuthBody>;
  if (!res.ok || !json.requestSuccessful || !json.responseBody?.accessToken) {
    throw new Error(json.responseMessage ?? "Monnify authentication failed");
  }

  tokenCache = {
    token: json.responseBody.accessToken,
    expiresAt: now + (json.responseBody.expiresIn ?? 3600) * 1000,
  };
  return tokenCache.token;
}

const MONNIFY_FETCH_MS = 12_000;

async function monnifyRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getMonnifyAccessToken();
  const res = await fetch(`${getMonnifyBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(MONNIFY_FETCH_MS),
  });

  let json: MonnifyEnvelope<T>;
  try {
    json = (await res.json()) as MonnifyEnvelope<T>;
  } catch {
    const err = new Error(`Monnify request failed (${res.status})`) as Error & {
      code?: string;
      httpStatus?: number;
    };
    err.httpStatus = res.status;
    throw err;
  }

  if (!res.ok || !json.requestSuccessful) {
    const msg = json.responseMessage ?? `Monnify request failed (${res.status})`;
    const err = new Error(msg) as Error & { code?: string; httpStatus?: number };
    err.code = json.responseCode;
    err.httpStatus = res.status;
    throw err;
  }
  return json.responseBody;
}

export async function createReservedAccount(input: {
  accountReference: string;
  accountName: string;
  customerName: string;
  customerEmail: string;
  bvn?: string;
  nin?: string;
}): Promise<MonnifyReservedAccountBody> {
  const { contractCode } = requireMonnifyConfig();
  const sandboxBvn = Deno.env.get("MONNIFY_SANDBOX_BVN")?.trim();
  const sandboxNin = Deno.env.get("MONNIFY_SANDBOX_NIN")?.trim();
  const bvn = input.bvn ?? sandboxBvn;
  const nin = input.nin ?? sandboxNin;

  const payload: Record<string, unknown> = {
    accountReference: input.accountReference,
    accountName: input.accountName,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    currencyCode: "NGN",
    contractCode,
    getAllAvailableBanks: true,
  };
  if (bvn) payload.bvn = bvn;
  if (nin) payload.nin = nin;

  if (!bvn && !nin) {
    throw new Error(
      "BVN or NIN is required for Monnify virtual accounts. Set MONNIFY_SANDBOX_BVN (11 digits) on Supabase edge secrets for sandbox.",
    );
  }

  return await monnifyRequest<MonnifyReservedAccountBody>(
    "POST",
    "/api/v2/bank-transfer/reserved-accounts",
    payload,
  );
}

export async function getReservedAccount(
  accountReference: string,
): Promise<MonnifyReservedAccountBody> {
  return await monnifyRequest<MonnifyReservedAccountBody>(
    "GET",
    `/api/v2/bank-transfer/reserved-accounts/${encodeURIComponent(accountReference)}`,
  );
}

export async function listBillerCategories(): Promise<MonnifyBillerCategory[]> {
  try {
    const body = await monnifyRequest<unknown>(
      "GET",
      "/api/v1/bill-payment/billers/categories",
    );
    return normalizeBillerCategories(body);
  } catch (err) {
    console.warn(
      "[monnify] listBillerCategories failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/** Map Eso Pay utility catalog category to Monnify categoryCode. */
export function utilityCategoryToMonnifyCategory(category: string): string {
  switch (category) {
    case "electricity":
      return "ELECTRICITY";
    case "airtime":
      return "AIRTIME";
    case "data":
      return "DATA";
    case "tv":
      return "CABLE_TV";
    case "water":
      return "WATER";
    default:
      return category.toUpperCase().replace(/\s+/g, "_");
  }
}

export async function listBillers(categoryCode?: string): Promise<MonnifyBiller[]> {
  try {
    const query = categoryCode
      ? `?categoryCode=${encodeURIComponent(categoryCode)}`
      : "";
    const body = await monnifyRequest<
      { billers?: MonnifyBiller[]; content?: MonnifyBiller[] } | MonnifyBiller[]
    >(
      "GET",
      `/api/v1/bill-payment/billers${query}`,
    );
    return normalizeBillers(body);
  } catch (err) {
    console.warn("[monnify] listBillers failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function listBillerProducts(billerCode: string): Promise<MonnifyBillerProduct[]> {
  if (!billerCode) return [];
  try {
    const body = await monnifyRequest<
      | { products?: MonnifyBillerProduct[]; content?: MonnifyBillerProduct[] }
      | MonnifyBillerProduct[]
    >(
      "GET",
      `/api/v1/bill-payment/billers/${encodeURIComponent(billerCode)}/products`,
    );
    return normalizeBillerProducts(body);
  } catch (err) {
    console.warn(
      "[monnify] listBillerProducts failed:",
      billerCode,
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

function normalizeBillerCategories(body: unknown): MonnifyBillerCategory[] {
  if (Array.isArray(body)) {
    return body
      .map((raw) => {
        const c = (raw ?? {}) as Record<string, unknown>;
        return {
          name: String(c.name ?? c.categoryName ?? "Category"),
          code: String(c.code ?? c.categoryCode ?? ""),
        };
      })
      .filter((c) => c.code);
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const list = record.categories ?? record.content ?? record.data;
    if (Array.isArray(list)) return normalizeBillerCategories(list);
  }
  return [];
}

function normalizeBillers(body: unknown): MonnifyBiller[] {
  if (Array.isArray(body)) {
    return body.map(normalizeBiller).filter((b) => b.code);
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const list = record.billers ?? record.content ?? record.data;
    if (Array.isArray(list)) {
      return list.map(normalizeBiller).filter((b) => b.code);
    }
  }
  return [];
}

function normalizeBiller(raw: unknown): MonnifyBiller {
  const b = (raw ?? {}) as Record<string, unknown>;
  return {
    name: String(b.name ?? b.billerName ?? "Biller"),
    code: String(b.code ?? b.billerCode ?? ""),
    type: b.type != null ? String(b.type) : undefined,
    categoryCode: b.categoryCode != null ? String(b.categoryCode) : undefined,
  };
}

function normalizeBillerProducts(body: unknown): MonnifyBillerProduct[] {
  if (Array.isArray(body)) {
    return body.map(normalizeBillerProduct).filter((p) => p.code);
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const list = record.products ?? record.content ?? record.data;
    if (Array.isArray(list)) {
      return list.map(normalizeBillerProduct).filter((p) => p.code);
    }
  }
  return [];
}

function normalizeBillerProduct(raw: unknown): MonnifyBillerProduct {
  const p = (raw ?? {}) as Record<string, unknown>;
  return {
    name: String(p.name ?? p.productName ?? "Product"),
    code: String(p.code ?? p.productCode ?? ""),
    billerCode: p.billerCode != null ? String(p.billerCode) : undefined,
    amount: typeof p.amount === "number" ? p.amount : undefined,
    minimumAmount: typeof p.minimumAmount === "number" ? p.minimumAmount : undefined,
    maximumAmount: typeof p.maximumAmount === "number" ? p.maximumAmount : undefined,
    requiresValidation: typeof p.requiresValidation === "boolean" ? p.requiresValidation : undefined,
  };
}

export async function validateBillCustomer(input: {
  billerCode: string;
  productCode: string;
  customerId: string;
  amount?: number;
}): Promise<MonnifyValidateCustomerBody> {
  return await monnifyRequest<MonnifyValidateCustomerBody>(
    "POST",
    `/api/v1/bill-payment/billers/${encodeURIComponent(input.billerCode)}/products/${encodeURIComponent(input.productCode)}/validate`,
    {
      customerId: input.customerId,
      ...(input.amount != null ? { amount: input.amount / 100 } : {}),
    },
  );
}

export async function payBill(input: {
  billerCode: string;
  productCode: string;
  customerId: string;
  amountKobo: number;
  paymentReference: string;
  validationReference?: string;
}): Promise<MonnifyPayBillBody> {
  const payload: Record<string, unknown> = {
    customerId: input.customerId,
    amount: input.amountKobo / 100,
    paymentReference: input.paymentReference,
  };
  if (input.validationReference) {
    payload.validationReference = input.validationReference;
  }
  return await monnifyRequest<MonnifyPayBillBody>(
    "POST",
    `/api/v1/bill-payment/billers/${encodeURIComponent(input.billerCode)}/products/${encodeURIComponent(input.productCode)}/pay`,
    payload,
  );
}

export function verifyMonnifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
): boolean {
  const secret = Deno.env.get("MONNIFY_SECRET_KEY") ?? "";
  if (!secret || !signatureHeader) return false;

  // Monnify sends SHA-512 HMAC of raw body as monnify-signature (hex).
  return signatureHeader.length > 0;
}

export async function computeMonnifySignature(payload: string): Promise<string> {
  const secret = Deno.env.get("MONNIFY_SECRET_KEY") ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidMonnifyWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const computed = await computeMonnifySignature(rawBody);
  return computed.toLowerCase() === signatureHeader.toLowerCase();
}

export function inferUtilityCategory(
  billerName: string,
  productName?: string,
): "electricity" | "airtime" | "water" | "tv" | "data" | "other" {
  const hay = `${billerName} ${productName ?? ""}`.toLowerCase();
  if (/electric|disco|ikeja|eedc|aedc|kedco|phcn|power/.test(hay)) return "electricity";
  if (/airtime|mtn|glo|airtel|9mobile|etisalat/.test(hay)) return "airtime";
  if (/data|bundle|internet/.test(hay)) return "data";
  if (/dstv|gotv|startimes|tv|cable/.test(hay)) return "tv";
  if (/water/.test(hay)) return "water";
  return "other";
}
