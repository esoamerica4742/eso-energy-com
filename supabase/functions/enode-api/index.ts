/**
 * Authenticated Enode BFF for mobile — Link sessions, device list, telemetry.
 * All requests require Supabase JWT; scoped by company_id.
 */
import { createServiceClient, resolveAuthContext } from "../_shared/supabase.ts";
import {
  createLinkSession,
  enodeUserIdForCompany,
} from "../_shared/enode.ts";
import { processWebhookQueueBatch, syncCompanyDevices, syncSingleDevice } from "../_shared/sync.ts";
import { corsHeaders, jsonResponse, optionsResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);

  if (req.method === "POST" && path.startsWith("/jobs/")) {
    const expected = Deno.env.get("ENODE_JOB_TOKEN") ?? "";
    const provided = req.headers.get("x-job-token") ?? "";
    if (!expected || provided !== expected) {
      return jsonResponse({ error: "Unauthorized job token" }, 401);
    }
    try {
      if (path === "/jobs/process-webhook-queue") {
        const limit = Number(url.searchParams.get("limit") ?? "200");
        const parallel = Number(url.searchParams.get("parallel") ?? "8");
        const result = await processWebhookQueueBatch(limit, parallel);
        return jsonResponse({ ok: true, ...result });
      }
      if (path === "/jobs/offline-check") {
        const stale = Number(url.searchParams.get("staleMinutes") ?? "10");
        const critical = Number(url.searchParams.get("criticalMinutes") ?? "15");
        const cooldown = Number(url.searchParams.get("cooldownMinutes") ?? "30");
        const supabase = createServiceClient();
        const { data, error } = await supabase.rpc("enode_detect_offline", {
          p_stale_minutes: stale,
          p_critical_minutes: critical,
          p_cooldown_minutes: cooldown,
        });
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true, offline: data });
      }
      if (path === "/jobs/rollups") {
        const hourlyHours = Number(url.searchParams.get("hourlyHours") ?? "72");
        const dailyDays = Number(url.searchParams.get("dailyDays") ?? "30");
        const rawDays = Number(url.searchParams.get("rawDays") ?? "14");
        const fiveMinDays = Number(url.searchParams.get("fiveMinDays") ?? "120");
        const hourlyRetainDays = Number(url.searchParams.get("hourlyRetainDays") ?? "730");
        const supabase = createServiceClient();

        const [{ data: hourly, error: hourlyError }, { data: daily, error: dailyError }, { data: prune, error: pruneError }] =
          await Promise.all([
            supabase.rpc("enode_rollup_hourly", { p_hours_back: hourlyHours }),
            supabase.rpc("enode_rollup_daily", { p_days_back: dailyDays }),
            supabase.rpc("enode_prune_telemetry", {
              p_raw_days: rawDays,
              p_5m_days: fiveMinDays,
              p_hourly_days: hourlyRetainDays,
            }),
          ]);
        if (hourlyError || dailyError || pruneError) {
          return jsonResponse(
            { error: hourlyError?.message ?? dailyError?.message ?? pruneError?.message ?? "Rollup job failed" },
            500,
          );
        }
        return jsonResponse({ ok: true, hourlyRows: hourly, dailyRows: daily, prune });
      }
      return jsonResponse({ error: "Unknown job" }, 404);
    } catch (err) {
      return jsonResponse(
        { error: err instanceof Error ? err.message : "Job processing failed" },
        500,
      );
    }
  }

  const auth = await resolveAuthContext(req);
  if (!auth) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    if (req.method === "POST" && (path === "/link" || path === "/link-session")) {
      return await handleLink(req, auth.companyId);
    }
    if (req.method === "GET" && path === "/devices") {
      return await handleListDevices(auth.companyId, url);
    }
    if (req.method === "GET" && path.startsWith("/devices/")) {
      const deviceId = path.split("/")[2];
      return await handleGetDevice(auth.companyId, deviceId, url);
    }
    if (req.method === "POST" && path === "/sync") {
      return await handleSyncAll(auth.companyId);
    }
    if (req.method === "POST" && /^\/devices\/[^/]+\/sync$/.test(path)) {
      const deviceId = path.split("/")[2];
      return await handleSyncDevice(auth.companyId, deviceId);
    }
    if (req.method === "POST" && path === "/notifications/register") {
      return await handleRegisterPushToken(req, auth.userId, auth.companyId);
    }
    if (req.method === "GET" && path === "/telemetry/latest") {
      return await handleTelemetryLatest(auth.companyId, url);
    }
    if (req.method === "GET" && path === "/telemetry/site-summary") {
      return await handleTelemetrySiteSummary(auth.companyId, url);
    }
    if (req.method === "GET" && path.startsWith("/telemetry/")) {
      const deviceId = path.split("/")[2];
      return await handleTelemetry(auth.companyId, deviceId, url);
    }
    if (req.method === "GET" && path === "/connection") {
      return await handleConnection(auth.companyId);
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (err) {
    console.error("[enode-api]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
});

function normalizePath(pathname: string): string {
  const stripped = pathname
    .replace(/^\/functions\/v1\/enode-api/, "")
    .replace(/^\/enode-api/, "");
  return stripped || "/";
}

async function handleLink(req: Request, companyId: string): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    redirectUri?: string;
    vendorType?: "inverter" | "charger" | "battery";
  };

  const redirectUri = body.redirectUri ??
    Deno.env.get("ENODE_LINK_REDIRECT_URI") ??
    "esoenergymobile://link-device/callback";

  const enodeUserId = enodeUserIdForCompany(companyId);
  const session = await createLinkSession({
    enodeUserId,
    redirectUri,
    vendorType: body.vendorType ?? "inverter",
  });

  const supabase = createServiceClient();
  await supabase.from("enode_connections").upsert(
    {
      company_id: companyId,
      enode_user_id: enodeUserId,
      link_status: "pending",
      last_link_url: session.linkUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" },
  );

  return jsonResponse({
    linkUrl: session.linkUrl,
    linkToken: session.linkToken,
    enodeUserId,
    redirectUri,
  });
}

async function handleListDevices(
  companyId: string,
  url: URL,
): Promise<Response> {
  const forceSync = url.searchParams.get("sync") === "true";
  if (forceSync) {
    await syncCompanyDevices(companyId);
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("enode_devices")
    .select("*")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ devices: data ?? [] });
}

async function handleGetDevice(
  companyId: string,
  deviceId: string,
  url: URL,
): Promise<Response> {
  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from("enode_devices")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", deviceId)
    .maybeSingle();

  if (error) return jsonResponse({ error: error.message }, 500);
  if (!row) return jsonResponse({ error: "Device not found" }, 404);

  if (url.searchParams.get("refresh") === "true") {
    try {
      await syncSingleDevice(companyId, row.enode_device_id, row.device_type);
      const { data: refreshed } = await supabase
        .from("enode_devices")
        .select("*")
        .eq("id", deviceId)
        .single();
      return jsonResponse({ device: refreshed });
    } catch (err) {
      return jsonResponse({
        device: row,
        warning: err instanceof Error ? err.message : "Refresh failed",
      });
    }
  }

  return jsonResponse({ device: row });
}

async function handleSyncAll(companyId: string): Promise<Response> {
  const count = await syncCompanyDevices(companyId);
  return jsonResponse({ synced: count });
}

async function handleSyncDevice(
  companyId: string,
  deviceId: string,
): Promise<Response> {
  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("enode_devices")
    .select("enode_device_id, device_type")
    .eq("company_id", companyId)
    .eq("id", deviceId)
    .maybeSingle();

  if (!row) return jsonResponse({ error: "Device not found" }, 404);
  await syncSingleDevice(companyId, row.enode_device_id, row.device_type);
  return jsonResponse({ ok: true });
}

async function handleTelemetry(
  companyId: string,
  deviceId: string,
  url: URL,
): Promise<Response> {
  const hours = Number(url.searchParams.get("hours") ?? "24");
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("enode_telemetry_5m")
    .select("production_kw, charge_kw, grid_kw, bucket_start")
    .eq("company_id", companyId)
    .eq("device_id", deviceId)
    .gte("bucket_start", since)
    .order("bucket_start", { ascending: true })
    .limit(500);

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({
    points: (data ?? []).map((p) => ({
      production_kw: p.production_kw,
      charge_kw: p.charge_kw,
      grid_kw: p.grid_kw,
      recorded_at: p.bucket_start,
    })),
  });
}

async function handleConnection(companyId: string): Promise<Response> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("enode_connections")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  return jsonResponse({ connection: data });
}

async function handleTelemetryLatest(companyId: string, url: URL): Promise<Response> {
  const siteId = url.searchParams.get("siteId");
  const supabase = createServiceClient();
  const q = supabase
    .from("telemetry_latest_state")
    .select("device_id,site_id,solar_output_kw,load_draw_kw,battery_soc_percent,inverter_status,grid_status,fault_code,warning_code,system_timestamp,updated_at")
    .eq("tenant_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (siteId) q.eq("site_id", siteId);
  const { data, error } = await q;
  if (!error) return jsonResponse({ points: data ?? [] });

  const missingLatestState =
    error.message.includes("telemetry_latest_state") ||
    error.message.includes("schema cache") ||
    error.message.includes("relation");
  if (!missingLatestState) {
    return jsonResponse({ error: error.message }, 500);
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from("enode_telemetry_latest")
    .select("device_id,production_kw,charge_kw,battery_level_pct,connection_status,fault_state,last_seen_at,updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (fallbackError) return jsonResponse({ error: fallbackError.message }, 500);
  const points = (fallback ?? []).map((row) => ({
    device_id: row.device_id,
    site_id: null,
    solar_output_kw: Number(row.production_kw ?? 0),
    load_draw_kw: Number(row.charge_kw ?? 0),
    battery_soc_percent: row.battery_level_pct,
    inverter_status: row.connection_status ?? "unknown",
    grid_status: "unknown",
    fault_code: row.fault_state ?? null,
    warning_code: null,
    system_timestamp: row.last_seen_at ?? row.updated_at,
    updated_at: row.updated_at,
  }));
  return jsonResponse({ points, source: "enode_telemetry_latest_fallback" });
}

async function handleTelemetrySiteSummary(companyId: string, url: URL): Promise<Response> {
  const siteId = url.searchParams.get("siteId");
  if (!siteId) return jsonResponse({ error: "siteId required" }, 400);
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("telemetry_site_summary")
    .select("*")
    .eq("tenant_id", companyId)
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ summary: data });
}

async function handleRegisterPushToken(req: Request, userId: string, companyId: string): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    expoPushToken?: string;
    platform?: string;
    appVersion?: string;
  };
  const expoPushToken = (body.expoPushToken ?? "").trim();
  if (!expoPushToken) return jsonResponse({ error: "expoPushToken required" }, 400);
  if (!expoPushToken.startsWith("ExponentPushToken[")) {
    return jsonResponse({ error: "Invalid Expo push token format" }, 400);
  }

  const supabase = createServiceClient();
  const platform = body.platform === "android" || body.platform === "ios" || body.platform === "web"
    ? body.platform
    : "web";
  const { error } = await supabase.from("mobile_push_tokens").upsert(
    {
      user_id: userId,
      company_id: companyId,
      expo_push_token: expoPushToken,
      platform,
      app_version: body.appVersion ?? "1.0.0",
      enabled: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "expo_push_token" },
  );
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ ok: true });
}
