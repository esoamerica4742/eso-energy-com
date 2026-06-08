/**
 * Solarman OpenAPI client (server-side only).
 * Docs: https://api.solarmanpv.com — OAuth token + plant/device endpoints.
 */

export const SOLARMAN_API_BASE = "https://api.solarmanpv.com";

export type SolarmanConfig = {
  appId: string;
  appSecret: string;
  language: string;
};

export type SolarmanTokenResponse = {
  success?: boolean;
  msg?: string | null;
  access_token?: string;
  refresh_token?: string;
  expires_in?: string | number;
  token_type?: string;
  uid?: number;
};

export type SolarmanOrgInfo = {
  companyId: number;
  companyName: string;
  roleName?: string;
};

export type SolarmanStation = {
  id: number;
  name: string;
  installedCapacity?: number;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  networkStatus?: string;
  batterySoc?: number;
  generationPower?: number;
  lastUpdateTime?: number;
};

export type SolarmanDevice = {
  deviceId: number;
  deviceSn: string;
  deviceType: string;
  connectStatus?: number;
  collectionTime?: number;
};

export type SolarmanDataPoint = {
  key?: string;
  name?: string;
  value?: string;
  unit?: string | null;
};

export function getSolarmanConfig(): SolarmanConfig {
  const appId = Deno.env.get("SOLARMAN_APP_ID");
  const appSecret = Deno.env.get("SOLARMAN_APP_SECRET");
  if (!appId || !appSecret) {
    throw new Error("Missing SOLARMAN_APP_ID or SOLARMAN_APP_SECRET");
  }
  return {
    appId,
    appSecret,
    language: Deno.env.get("SOLARMAN_LANGUAGE") ?? "en",
  };
}

export function solarmanUserIdForCompany(companyId: string): string {
  return `eso-solarman-${companyId}`;
}

export function solarmanDeviceExternalId(deviceId: number): string {
  return `solarman:${deviceId}`;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function solarmanRequest<T>(
  path: string,
  init: RequestInit & { token?: string; query?: Record<string, string> } = {},
): Promise<T> {
  const { token, query, ...rest } = init;
  const url = new URL(`${SOLARMAN_API_BASE}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  const headers = new Headers(rest.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url.toString(), { ...rest, headers });
  const text = await res.text();
  let body: T & { success?: boolean; msg?: string | null };
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Solarman invalid JSON (${res.status}): ${text.slice(0, 180)}`);
  }

  if (!res.ok || body.success === false) {
    throw new Error(body.msg ?? `Solarman request failed (${res.status})`);
  }

  return body;
}

export async function obtainSolarmanToken(input: {
  email?: string;
  username?: string;
  mobile?: string;
  countryCode?: string;
  password: string;
  orgId?: number;
}): Promise<SolarmanTokenResponse> {
  const config = getSolarmanConfig();
  const passwordHash = await sha256Hex(input.password);

  return solarmanRequest<SolarmanTokenResponse>("/account/v1.0/token", {
    method: "POST",
    query: {
      appId: config.appId,
      language: config.language,
    },
    body: JSON.stringify({
      appSecret: config.appSecret,
      email: input.email,
      username: input.username,
      mobile: input.mobile,
      countryCode: input.countryCode,
      orgId: input.orgId,
      password: passwordHash,
    }),
  });
}

export async function fetchSolarmanOrgList(token: string): Promise<SolarmanOrgInfo[]> {
  const config = getSolarmanConfig();
  const body = await solarmanRequest<{ orgInfoList?: SolarmanOrgInfo[] }>("/account/v1.0/info", {
    method: "POST",
    token,
    query: { language: config.language },
    body: JSON.stringify({}),
  });
  return body.orgInfoList ?? [];
}

export async function listSolarmanStations(
  token: string,
  page = 1,
  size = 50,
): Promise<{ total: number; stations: SolarmanStation[] }> {
  const config = getSolarmanConfig();
  const body = await solarmanRequest<{ total?: number; stationList?: SolarmanStation[] }>(
    "/station/v1.0/list",
    {
      method: "POST",
      token,
      query: { language: config.language },
      body: JSON.stringify({ page, size }),
    },
  );

  return {
    total: body.total ?? body.stationList?.length ?? 0,
    stations: body.stationList ?? [],
  };
}

export async function listSolarmanStationDevices(
  token: string,
  stationId: number,
  page = 1,
  size = 50,
): Promise<{ total: number; devices: SolarmanDevice[] }> {
  const config = getSolarmanConfig();
  const body = await solarmanRequest<{ total?: number; deviceListItems?: SolarmanDevice[] }>(
    "/station/v1.0/device",
    {
      method: "POST",
      token,
      query: { language: config.language },
      body: JSON.stringify({ stationId, page, size }),
    },
  );

  return {
    total: body.total ?? body.deviceListItems?.length ?? 0,
    devices: body.deviceListItems ?? [],
  };
}

export async function fetchSolarmanStationRealtime(
  token: string,
  stationId: number,
): Promise<Record<string, unknown>> {
  const config = getSolarmanConfig();
  return solarmanRequest<Record<string, unknown>>("/station/v1.0/realTime", {
    method: "POST",
    token,
    query: { language: config.language },
    body: JSON.stringify({ stationId }),
  });
}

export async function fetchSolarmanDeviceCurrentData(
  token: string,
  deviceId: number,
  deviceSn: string,
): Promise<{
  deviceState?: number;
  deviceType?: string;
  dataList?: SolarmanDataPoint[];
}> {
  const config = getSolarmanConfig();
  return solarmanRequest("/device/v1.0/currentData", {
    method: "POST",
    token,
    query: { language: config.language },
    body: JSON.stringify({ deviceId, deviceSn }),
  });
}

export function dataListToMap(dataList: SolarmanDataPoint[] | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of dataList ?? []) {
    if (item.key) map.set(item.key, item.value ?? "");
  }
  return map;
}

export function wattsToKw(raw: string | undefined): number {
  if (!raw) return 0;
  const watts = Number(raw);
  if (Number.isNaN(watts)) return 0;
  return Number((watts / 1000).toFixed(3));
}

export function mapSolarmanDeviceState(state?: number): {
  reachable: boolean;
  connectionStatus: "connected" | "offline" | "error";
} {
  if (state === 1) return { reachable: true, connectionStatus: "connected" };
  if (state === 2) return { reachable: false, connectionStatus: "error" };
  return { reachable: false, connectionStatus: "offline" };
}

export function tokenExpiresAt(expiresIn: string | number | undefined): string | null {
  if (expiresIn == null) return null;
  const seconds = Number(expiresIn);
  if (Number.isNaN(seconds)) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}
