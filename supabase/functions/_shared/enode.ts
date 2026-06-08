/**
 * Server-side Enode API client (OAuth + typed resources).
 * Used by edge functions only — secrets never leave the server.
 */

export const ENODE_API_VERSION = "2024-01-01";

export type EnodeEnvironment = "sandbox" | "production";

export function getEnodeConfig(): {
  env: EnodeEnvironment;
  apiBase: string;
  oauthBase: string;
  clientId: string;
  clientSecret: string;
  webhookSecret: string;
} {
  const env = (Deno.env.get("ENODE_ENV") ?? "sandbox") as EnodeEnvironment;
  const clientId = Deno.env.get("ENODE_CLIENT_ID");
  const clientSecret = Deno.env.get("ENODE_CLIENT_SECRET");
  const webhookSecret = Deno.env.get("ENODE_WEBHOOK_SECRET");

  if (!clientId || !clientSecret || !webhookSecret) {
    throw new Error("Missing ENODE_CLIENT_ID, ENODE_CLIENT_SECRET, or ENODE_WEBHOOK_SECRET");
  }

  const isProd = env === "production";
  return {
    env,
    clientId,
    clientSecret,
    webhookSecret,
    apiBase: isProd
      ? "https://enode-api.production.enode.io"
      : "https://enode-api.sandbox.enode.io",
    oauthBase: isProd
      ? "https://oauth.production.enode.io"
      : "https://oauth.sandbox.enode.io",
  };
}

/** Company-scoped Enode user id (multi-tenant safe). */
export function enodeUserIdForCompany(companyId: string): string {
  return `eso-company-${companyId}`;
}

export function companyIdFromEnodeUser(enodeUserId: string): string | null {
  const prefix = "eso-company-";
  if (!enodeUserId.startsWith(prefix)) return null;
  return enodeUserId.slice(prefix.length);
}

// ---------------------------------------------------------------------------
// OAuth token cache (per isolate)
// ---------------------------------------------------------------------------
let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getEnodeAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const { oauthBase, clientId, clientSecret } = getEnodeConfig();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
  });

  const res = await fetch(`${oauthBase}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Enode OAuth failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.value;
}

async function enodeFetch<T>(
  path: string,
  init: RequestInit & { enodeUserId?: string } = {},
): Promise<T> {
  const { apiBase } = getEnodeConfig();
  const token = await getEnodeAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Enode-Version", ENODE_API_VERSION);
  if (init.enodeUserId) headers.set("Enode-User-Id", init.enodeUserId);

  const res = await fetch(`${apiBase}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Enode API ${path} (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Types (2024-01-01 subset)
// ---------------------------------------------------------------------------
export type EnodeLinkSession = {
  linkUrl: string;
  linkToken: string;
};

export type EnodeProductionState = {
  productionRate: number | null;
  isProducing: boolean | null;
  lastUpdated: string | null;
};

export type EnodeChargeState = {
  chargeRate: number | null;
  batteryLevel: number | null;
  status: string | null;
  lastUpdated: string | null;
};

export type EnodeInverter = {
  id: string;
  userId: string;
  vendor: string;
  lastSeen: string;
  isReachable: boolean;
  productionState?: EnodeProductionState;
  information?: { brand?: string; model?: string; sn?: string };
};

export type EnodeCharger = {
  id: string;
  userId: string;
  vendor: string;
  lastSeen: string;
  isReachable: boolean;
  chargeState?: EnodeChargeState;
  information?: { brand?: string; model?: string; sn?: string };
};

export type EnodePaginated<T> = {
  data: T[];
  pagination?: { after?: string; before?: string };
};

export type EnodeWebhookEvent = {
  event: string;
  version: string;
  user?: { id: string };
  device?: {
    id: string;
    type?: string;
    vendor?: string;
    isReachable?: boolean;
    lastSeen?: string;
  };
  charger?: { id: string };
  action?: {
    id: string;
    state?: string;
    targetId?: string;
  };
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------
export function linkScopesForVendor(
  vendorType: "inverter" | "charger" | "battery" = "inverter",
): string[] {
  switch (vendorType) {
    case "charger":
      return ["charger:read:data"];
    case "battery":
      return ["battery:read:data"];
    case "inverter":
    default:
      return ["inverter:read:data"];
  }
}

export async function createLinkSession(params: {
  enodeUserId: string;
  redirectUri: string;
  vendorType?: "inverter" | "charger" | "battery";
  scopes?: string[];
  language?: string;
}): Promise<EnodeLinkSession> {
  const vendorType = params.vendorType ?? "inverter";
  const scopes = params.scopes ?? linkScopesForVendor(vendorType);
  return enodeFetch<EnodeLinkSession>(`/users/${params.enodeUserId}/link`, {
    method: "POST",
    enodeUserId: params.enodeUserId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vendorType,
      scopes,
      language: params.language ?? "en-US",
      redirectUri: params.redirectUri,
      colorScheme: "dark",
    }),
  });
}

export async function listInverters(enodeUserId: string): Promise<EnodeInverter[]> {
  const page = await enodeFetch<EnodePaginated<EnodeInverter>>(
    `/users/${enodeUserId}/inverters?pageSize=50`,
    { enodeUserId },
  );
  return page.data ?? [];
}

export async function getInverter(
  enodeUserId: string,
  inverterId: string,
): Promise<EnodeInverter> {
  return enodeFetch<EnodeInverter>(
    `/users/${enodeUserId}/inverters/${inverterId}`,
    { enodeUserId },
  );
}

export async function listChargers(enodeUserId: string): Promise<EnodeCharger[]> {
  const page = await enodeFetch<EnodePaginated<EnodeCharger>>(
    `/users/${enodeUserId}/chargers?pageSize=50`,
    { enodeUserId },
  );
  return page.data ?? [];
}

export async function getCharger(
  enodeUserId: string,
  chargerId: string,
): Promise<EnodeCharger> {
  return enodeFetch<EnodeCharger>(
    `/users/${enodeUserId}/chargers/${chargerId}`,
    { enodeUserId },
  );
}

// ---------------------------------------------------------------------------
// Webhook signature (HMAC-SHA256 hex of raw body)
// ---------------------------------------------------------------------------
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader) return false;
  const { webhookSecret } = getEnodeConfig();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const received = signatureHeader.replace(/^sha256=/i, "").trim().toLowerCase();
  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}

export function deviceTypeFromEvent(event: EnodeWebhookEvent): string {
  const t = event.device?.type ?? "";
  if (t.includes("inverter") || t === "inverter") return "inverter";
  if (t.includes("charger") || t === "charger") return "charger";
  if (t.includes("battery") || t === "battery") return "battery";
  return "unknown";
}
