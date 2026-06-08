/**
 * Authenticated Solarman BFF — credential onboarding, org selection, plant linking, sync.
 */
import { createServiceClient, resolveAuthContext } from "../_shared/supabase.ts";
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import {
  fetchSolarmanOrgList,
  listSolarmanStations,
  obtainSolarmanToken,
  solarmanUserIdForCompany,
  tokenExpiresAt,
} from "../_shared/solarman.ts";
import { linkSolarmanStation, syncAllLinkedSolarmanCompanies, syncSolarmanCompany } from "../_shared/solarmanSync.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  if (req.method === "POST" && path.startsWith("/jobs/")) {
    const expected = Deno.env.get("ENODE_JOB_TOKEN") ?? Deno.env.get("SOLARMAN_JOB_TOKEN") ?? "";
    const provided = req.headers.get("x-job-token") ?? "";
    if (!expected || provided !== expected) {
      return jsonResponse({ error: "Unauthorized job token" }, 401);
    }

    try {
      if (path === "/jobs/sync-all") {
        const result = await syncAllLinkedSolarmanCompanies();
        return jsonResponse({ ok: true, intervalMs: 300_000, ...result });
      }
      return jsonResponse({ error: "Unknown job" }, 404);
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : "Job failed" },
        500,
      );
    }
  }

  const auth = await resolveAuthContext(req);
  if (!auth) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    if (req.method === "GET" && path === "/connection") {
      return await handleConnection(auth.companyId);
    }
    if (req.method === "POST" && path === "/connect") {
      return await handleConnect(req, auth.companyId);
    }
    if (req.method === "POST" && path === "/connect/org") {
      return await handleConnectOrg(req, auth.companyId);
    }
    if (req.method === "GET" && path === "/orgs") {
      return await handleOrgs(auth.companyId);
    }
    if (req.method === "GET" && path === "/stations") {
      return await handleStations(auth.companyId);
    }
    if (req.method === "POST" && path === "/stations/link") {
      return await handleLinkStation(req, auth.companyId);
    }
    if (req.method === "POST" && path === "/sync") {
      return await handleSync(auth.companyId);
    }
    if (req.method === "POST" && path === "/disconnect") {
      return await handleDisconnect(auth.companyId);
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    console.error("[solarman-api]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
});

function normalizePath(pathname: string): string {
  const stripped = pathname
    .replace(/^\/functions\/v1\/solarman-api/, "")
    .replace(/^\/solarman-api/, "");
  return stripped || "/";
}

async function handleConnection(companyId: string): Promise<Response> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("solarman_connections")
    .select(
      "link_status, account_label, org_id, org_name, uid, linked_at, last_sync_at, last_error, updated_at",
    )
    .eq("company_id", companyId)
    .maybeSingle();

  const { count: stationCount } = await supabase
    .from("solarman_stations")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const { count: linkedCount } = await supabase
    .from("solarman_stations")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .not("site_id", "is", null);

  return jsonResponse({
    connection: data,
    stationCount: stationCount ?? 0,
    linkedStationCount: linkedCount ?? 0,
  });
}

async function handleConnect(req: Request, companyId: string): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    username?: string;
    mobile?: string;
    countryCode?: string;
    password?: string;
  };

  if (!body.password || (!body.email && !body.username && !body.mobile)) {
    return jsonResponse({ error: "Provide Solarman email/username/mobile and password" }, 400);
  }

  const token = await obtainSolarmanToken({
    email: body.email,
    username: body.username,
    mobile: body.mobile,
    countryCode: body.countryCode,
    password: body.password,
  });

  if (!token.access_token) {
    return jsonResponse({ error: token.msg ?? "Solarman authentication failed" }, 401);
  }

  const orgs = await fetchSolarmanOrgList(token.access_token).catch(() => []);
  const accountLabel = body.email ?? body.username ?? body.mobile ?? "Solarman account";
  const solarmanUserId = solarmanUserIdForCompany(companyId);
  const supabase = createServiceClient();

  await supabase.from("solarman_connections").upsert(
    {
      company_id: companyId,
      solarman_user_id: solarmanUserId,
      link_status: orgs.length > 1 ? "pending" : "linked",
      account_label: accountLabel,
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      token_type: token.token_type ?? "bearer",
      expires_at: tokenExpiresAt(token.expires_in),
      uid: token.uid ?? null,
      org_id: orgs.length === 1 ? orgs[0].companyId : null,
      org_name: orgs.length === 1 ? orgs[0].companyName : null,
      linked_at: orgs.length <= 1 ? new Date().toISOString() : null,
      last_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" },
  );

  if (orgs.length <= 1) {
    await syncSolarmanCompany(companyId).catch((err) => {
      console.warn("[solarman-api] initial sync failed", err);
    });
  }

  return jsonResponse({
    ok: true,
    requiresOrgSelection: orgs.length > 1,
    orgs,
    accountLabel,
  });
}

async function handleConnectOrg(req: Request, companyId: string): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    orgId?: number;
    email?: string;
    username?: string;
    mobile?: string;
    countryCode?: string;
    password?: string;
  };

  if (!body.orgId || !body.password) {
    return jsonResponse({ error: "orgId and password are required" }, 400);
  }

  const token = await obtainSolarmanToken({
    email: body.email,
    username: body.username,
    mobile: body.mobile,
    countryCode: body.countryCode,
    password: body.password,
    orgId: body.orgId,
  });

  if (!token.access_token) {
    return jsonResponse({ error: token.msg ?? "Solarman business token failed" }, 401);
  }

  const orgs = await fetchSolarmanOrgList(token.access_token).catch(() => []);
  const selected = orgs.find((org) => org.companyId === body.orgId);
  const supabase = createServiceClient();

  await supabase
    .from("solarman_connections")
    .update({
      link_status: "linked",
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      token_type: token.token_type ?? "bearer",
      expires_at: tokenExpiresAt(token.expires_in),
      org_id: body.orgId,
      org_name: selected?.companyName ?? null,
      linked_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);

  await syncSolarmanCompany(companyId);

  return jsonResponse({ ok: true, orgId: body.orgId, orgName: selected?.companyName ?? null });
}

async function handleOrgs(companyId: string): Promise<Response> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("solarman_connections")
    .select("access_token")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!data?.access_token) return jsonResponse({ orgs: [] });
  const orgs = await fetchSolarmanOrgList(data.access_token);
  return jsonResponse({ orgs });
}

async function handleStations(companyId: string): Promise<Response> {
  const supabase = createServiceClient();
  const { data: connection } = await supabase
    .from("solarman_connections")
    .select("access_token")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!connection?.access_token) {
    return jsonResponse({ error: "Connect Solarman first" }, 400);
  }

  const remote = await listSolarmanStations(connection.access_token, 1, 100);
  for (const station of remote.stations) {
    await supabase.from("solarman_stations").upsert(
      {
        company_id: companyId,
        solarman_station_id: station.id,
        name: station.name,
        installed_capacity: station.installedCapacity ?? null,
        location_address: station.locationAddress ?? null,
        location_lat: station.locationLat ?? null,
        location_lng: station.locationLng ?? null,
        network_status: station.networkStatus ?? null,
        battery_soc: station.batterySoc ?? null,
        raw_state: station as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,solarman_station_id" },
    );
  }

  const { data: rows } = await supabase
    .from("solarman_stations")
    .select(
      "solarman_station_id, name, installed_capacity, location_address, network_status, battery_soc, site_id, linked_at",
    )
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  return jsonResponse({ stations: rows ?? [], total: remote.total });
}

async function handleLinkStation(req: Request, companyId: string): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    stationId?: number;
    siteId?: string;
  };

  if (!body.stationId || !body.siteId) {
    return jsonResponse({ error: "stationId and siteId are required" }, 400);
  }

  await linkSolarmanStation(companyId, body.stationId, body.siteId);
  const result = await syncSolarmanCompany(companyId);
  return jsonResponse({ ok: true, ...result });
}

async function handleSync(companyId: string): Promise<Response> {
  const result = await syncSolarmanCompany(companyId);
  return jsonResponse({ ok: true, ...result });
}

async function handleDisconnect(companyId: string): Promise<Response> {
  const supabase = createServiceClient();
  await supabase.from("solarman_stations").delete().eq("company_id", companyId);
  await supabase.from("solarman_connections").delete().eq("company_id", companyId);
  return jsonResponse({ ok: true });
}
