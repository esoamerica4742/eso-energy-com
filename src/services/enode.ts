/**
 * Enode BFF client for web — session-authenticated, retries, no secrets in browser.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  EnodeApiErrorBody,
  EnodeDeviceResponse,
  EnodeDevicesResponse,
  EnodeLinkSessionResponse,
  EnodeTelemetryResponse,
} from "@/services/enode.types";

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 400;

export class EnodeApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EnodeApiError";
    this.status = status;
  }
}

function getApiBase(): string {
  const override = import.meta.env.VITE_ENODE_API_URL as string | undefined;
  if (override) return override.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/enode`;
  }
  const supabaseUrl =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/enode-api`;
}

function getRedirectUri(): string {
  if (typeof window !== "undefined") {
    const fromEnv = import.meta.env.VITE_ENODE_LINK_REDIRECT_URI as
      | string
      | undefined;
    if (fromEnv) return fromEnv;
    return `${window.location.origin}/link-device/callback`;
  }
  return "http://10.110.187.192:5178/link-device/callback";
}

function getAnonKey(): string {
  return (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ??
    "";
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new EnodeApiError("Not signed in", 401);
  }
  return data.session.access_token;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options?: { retries?: number },
): Promise<T> {
  const maxRetries = options?.retries ?? DEFAULT_MAX_RETRIES;
  const token = await getAccessToken();
  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: getAnonKey(),
          ...(init.headers as Record<string, string> | undefined),
        },
      });

      if (!res.ok) {
        const body = await parseJson<EnodeApiErrorBody>(res);
        const message = body.error ?? `Request failed (${res.status})`;
        if (isRetryable(res.status) && attempt < maxRetries) {
          await sleep(BASE_DELAY_MS * 2 ** attempt);
          continue;
        }
        throw new EnodeApiError(message, res.status);
      }

      return parseJson<T>(res);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof EnodeApiError && !isRetryable(err.status)) throw err;
      if (attempt < maxRetries) {
        await sleep(BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
    }
  }

  throw lastError ?? new EnodeApiError("Request failed", 500);
}

export const enodeClient = {
  getRedirectUri,

  createLinkSession(vendorType?: "inverter" | "charger" | "battery") {
    return request<EnodeLinkSessionResponse>("/link-session", {
      method: "POST",
      body: JSON.stringify({
        redirectUri: getRedirectUri(),
        vendorType: vendorType ?? "inverter",
      }),
    });
  },

  listDevices(sync = false) {
    return request<EnodeDevicesResponse>(`/devices${sync ? "?sync=true" : ""}`);
  },

  getDevice(deviceId: string, refresh = false) {
    return request<EnodeDeviceResponse>(
      `/devices/${deviceId}${refresh ? "?refresh=true" : ""}`,
    );
  },

  syncAll() {
    return request<{ synced: number }>("/sync", { method: "POST" });
  },

  getTelemetry(deviceId: string, hours = 24) {
    return request<EnodeTelemetryResponse>(
      `/telemetry/${deviceId}?hours=${hours}`,
    );
  },
};

export function isEnodeConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL);
}
