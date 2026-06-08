/**
 * Server-side Enode API (Node) — mirrors supabase/functions/_shared/enode.ts
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { ensureEnodeEnv } from "@/lib/enode-server/env";

ensureEnodeEnv();

export const ENODE_API_VERSION = "2024-01-01";

export type EnodeEnvironment = "sandbox" | "production";

export function isEnodeConfigured(): boolean {
  return Boolean(
    process.env.ENODE_CLIENT_ID &&
      process.env.ENODE_CLIENT_SECRET &&
      process.env.ENODE_WEBHOOK_SECRET,
  );
}

export function getEnodeConfig() {
  const env = (process.env.ENODE_ENV ?? "sandbox") as EnodeEnvironment;
  const clientId = process.env.ENODE_CLIENT_ID;
  const clientSecret = process.env.ENODE_CLIENT_SECRET;
  const webhookSecret = process.env.ENODE_WEBHOOK_SECRET;

  if (!clientId || !clientSecret || !webhookSecret) {
    throw new Error(
      "Enode not configured. Set ENODE_CLIENT_ID, ENODE_CLIENT_SECRET, and ENODE_WEBHOOK_SECRET in .env",
    );
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

export function enodeUserIdForCompany(companyId: string): string {
  return `eso-company-${companyId}`;
}

export function companyIdFromEnodeUser(enodeUserId: string): string | null {
  const prefix = "eso-company-";
  if (!enodeUserId.startsWith(prefix)) return null;
  return enodeUserId.slice(prefix.length);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getEnodeAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const { oauthBase, clientId, clientSecret } = getEnodeConfig();
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${oauthBase}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Enode OAuth failed (${res.status}): ${await res.text()}`);
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
    throw new Error(`Enode API ${path} (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export type EnodeLinkSession = { linkUrl: string; linkToken: string };

export type EnodeInverter = {
  id: string;
  userId: string;
  vendor: string;
  lastSeen: string;
  isReachable: boolean;
  productionState?: {
    productionRate: number | null;
    isProducing: boolean | null;
    lastUpdated: string | null;
  };
  information?: { brand?: string; model?: string; sn?: string };
};

export type EnodeCharger = {
  id: string;
  userId: string;
  vendor: string;
  lastSeen: string;
  isReachable: boolean;
  chargeState?: {
    chargeRate: number | null;
    batteryLevel: number | null;
    status: string | null;
    lastUpdated: string | null;
  };
  information?: { brand?: string; model?: string; sn?: string };
};

export type EnodePaginated<T> = { data: T[] };

export type EnodeWebhookEvent = {
  event: string;
  version: string;
  user?: { id: string };
  device?: { id: string; type?: string };
  charger?: { id: string };
  action?: { id: string; state?: string; targetId?: string };
  [key: string]: unknown;
};

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
}): Promise<EnodeLinkSession> {
  const vendorType = params.vendorType ?? "inverter";
  return enodeFetch<EnodeLinkSession>(`/users/${params.enodeUserId}/link`, {
    method: "POST",
    enodeUserId: params.enodeUserId,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vendorType,
      scopes: linkScopesForVendor(vendorType),
      language: "en-US",
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

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader || !process.env.ENODE_WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", process.env.ENODE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const received = signatureHeader.replace(/^sha256=/i, "").trim().toLowerCase();
  if (received.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function deviceTypeFromEvent(event: EnodeWebhookEvent): string {
  const t = event.device?.type ?? "";
  if (t.includes("inverter") || t === "inverter") return "inverter";
  if (t.includes("charger") || t === "charger") return "charger";
  if (t.includes("battery") || t === "battery") return "battery";
  return "unknown";
}
