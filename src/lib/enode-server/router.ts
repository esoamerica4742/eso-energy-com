import { resolveAuthContext } from "@/lib/enode-server/auth";
import {
  createLinkSession,
  enodeUserIdForCompany,
  isEnodeConfigured,
} from "@/lib/enode-server/enode";
import { processWebhookQueueBatch, syncCompanyDevices, syncSingleDevice } from "@/lib/enode-server/sync";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: CORS });
}

function normalizePath(pathname: string): string {
  return (
    pathname
      .replace(/^\/api\/enode/, "")
      .replace(/^\/functions\/v1\/enode-api/, "")
      .replace(/^\/enode-api/, "") || "/"
  );
}

export async function handleEnodeApiRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const auth = await resolveAuthContext(req);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const path = normalizePath(url.pathname);
  const segments = path.split("/").filter(Boolean);

  if (req.method === "POST" && path.startsWith("/jobs/")) {
    const expected = process.env.ENODE_JOB_TOKEN ?? "";
    const provided = req.headers.get("x-job-token") ?? "";
    if (!expected || provided !== expected) {
      return json({ error: "Unauthorized job token" }, 401);
    }
    if (path === "/jobs/process-webhook-queue") {
      const limit = Number(url.searchParams.get("limit") ?? "200");
      const parallel = Number(url.searchParams.get("parallel") ?? "8");
      const result = await processWebhookQueueBatch(limit, parallel);
      return json({ ok: true, ...result });
    }
    if (path === "/jobs/offline-check") {
      const stale = Number(url.searchParams.get("staleMinutes") ?? "10");
      const critical = Number(url.searchParams.get("criticalMinutes") ?? "15");
      const cooldown = Number(url.searchParams.get("cooldownMinutes") ?? "30");
      const { data, error } = await db.rpc("enode_detect_offline", {
        p_stale_minutes: stale,
        p_critical_minutes: critical,
        p_cooldown_minutes: cooldown,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, offline: data });
    }
    if (path === "/jobs/rollups") {
      const hourlyHours = Number(url.searchParams.get("hourlyHours") ?? "72");
      const dailyDays = Number(url.searchParams.get("dailyDays") ?? "30");
      const rawDays = Number(url.searchParams.get("rawDays") ?? "14");
      const fiveMinDays = Number(url.searchParams.get("fiveMinDays") ?? "120");
      const hourlyRetainDays = Number(url.searchParams.get("hourlyRetainDays") ?? "730");

      const [{ data: hourly, error: hourlyError }, { data: daily, error: dailyError }, { data: prune, error: pruneError }] =
        await Promise.all([
          db.rpc("enode_rollup_hourly", { p_hours_back: hourlyHours }),
          db.rpc("enode_rollup_daily", { p_days_back: dailyDays }),
          db.rpc("enode_prune_telemetry", {
            p_raw_days: rawDays,
            p_5m_days: fiveMinDays,
            p_hourly_days: hourlyRetainDays,
          }),
        ]);
      if (hourlyError || dailyError || pruneError) {
        return json(
          {
            error: hourlyError?.message ?? dailyError?.message ?? pruneError?.message ?? "Rollup job failed",
          },
          500,
        );
      }
      return json({ ok: true, hourlyRows: hourly, dailyRows: daily, prune });
    }
    return json({ error: "Unknown job" }, 404);
  }

  try {
    if (!isEnodeConfigured()) {
      if (path === "/devices" && req.method === "GET") {
        const { data } = await db
          .from("enode_devices")
          .select("*")
          .eq("company_id", auth.companyId)
          .order("updated_at", { ascending: false });
        return json({
          devices: data ?? [],
          enodeConfigured: false,
        });
      }
      if (path === "/connection" && req.method === "GET") {
        return json({ connection: null, enodeConfigured: false });
      }
      if (path === "/link" && req.method === "POST") {
        return json(
          {
            error: "Enode not configured",
            hint: "Add ENODE_CLIENT_ID, ENODE_CLIENT_SECRET, ENODE_WEBHOOK_SECRET to .env (run npm run setup:enode-env)",
          },
          503,
        );
      }
      if (path === "/sync" && req.method === "POST") {
        return json({ synced: 0, enodeConfigured: false });
      }
    }

    if (req.method === "POST" && (path === "/link" || path === "/link-session")) {
      const body = (await req.json().catch(() => ({}))) as {
        redirectUri?: string;
        vendorType?: "inverter" | "charger" | "battery";
      };
      const redirectUri =
        body.redirectUri ??
        process.env.ENODE_LINK_REDIRECT_URI ??
        process.env.VITE_ENODE_LINK_REDIRECT_URI ??
        "esoenergymobile://link-device/callback";

      const enodeUserId = enodeUserIdForCompany(auth.companyId);
      const session = await createLinkSession({
        enodeUserId,
        redirectUri,
        vendorType: body.vendorType ?? "inverter",
      });

      await db.from("enode_connections").upsert(
        {
          company_id: auth.companyId,
          enode_user_id: enodeUserId,
          link_status: "pending",
          last_link_url: session.linkUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" },
      );

      return json({
        linkUrl: session.linkUrl,
        linkToken: session.linkToken,
        enodeUserId,
        redirectUri,
      });
    }

    if (req.method === "GET" && path === "/devices") {
      if (url.searchParams.get("sync") === "true") {
        await syncCompanyDevices(auth.companyId);
      }
      const { data, error } = await db
        .from("enode_devices")
        .select("*")
        .eq("company_id", auth.companyId)
        .order("updated_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ devices: data ?? [] });
    }

    if (req.method === "GET" && segments[0] === "devices" && segments[1]) {
      const deviceId = segments[1];
      const { data: row, error } = await db
        .from("enode_devices")
        .select("*")
        .eq("company_id", auth.companyId)
        .eq("id", deviceId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!row) return json({ error: "Device not found" }, 404);

      if (url.searchParams.get("refresh") === "true") {
        try {
          await syncSingleDevice(
            auth.companyId,
            row.enode_device_id,
            row.device_type,
          );
          const { data: refreshed } = await db
            .from("enode_devices")
            .select("*")
            .eq("id", deviceId)
            .single();
          return json({ device: refreshed });
        } catch (err) {
          return json({
            device: row,
            warning: err instanceof Error ? err.message : "Refresh failed",
          });
        }
      }
      return json({ device: row });
    }

    if (req.method === "POST" && segments[0] === "devices" && segments[2] === "sync") {
      const deviceId = segments[1];
      const { data: row } = await db
        .from("enode_devices")
        .select("enode_device_id, device_type")
        .eq("company_id", auth.companyId)
        .eq("id", deviceId)
        .maybeSingle();
      if (!row) return json({ error: "Device not found" }, 404);
      await syncSingleDevice(
        auth.companyId,
        row.enode_device_id,
        row.device_type,
      );
      return json({ ok: true });
    }

    if (req.method === "POST" && path === "/sync") {
      const count = await syncCompanyDevices(auth.companyId);
      return json({ synced: count });
    }

    if (req.method === "POST" && path === "/notifications/register") {
      const body = (await req.json().catch(() => ({}))) as {
        expoPushToken?: string;
        platform?: string;
        appVersion?: string;
      };
      const expoPushToken = (body.expoPushToken ?? "").trim();
      if (!expoPushToken) return json({ error: "expoPushToken required" }, 400);
      if (!expoPushToken.startsWith("ExponentPushToken[")) {
        return json({ error: "Invalid Expo push token format" }, 400);
      }

      const { error } = await db.from("mobile_push_tokens").upsert(
        {
          user_id: auth.userId,
          company_id: auth.companyId,
          expo_push_token: expoPushToken,
          platform: body.platform === "android" || body.platform === "ios" || body.platform === "web" ? body.platform : "web",
          app_version: body.appVersion ?? "1.0.0",
          enabled: true,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "expo_push_token" },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (req.method === "GET" && path === "/telemetry/latest") {
      const siteId = url.searchParams.get("siteId");
      const q = db
        .from("telemetry_latest_state")
        .select("device_id,site_id,solar_output_kw,load_draw_kw,battery_soc_percent,inverter_status,grid_status,fault_code,warning_code,system_timestamp,updated_at")
        .eq("tenant_id", auth.companyId)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (siteId) q.eq("site_id", siteId);
      const { data, error } = await q;
      if (!error) return json({ points: data ?? [] });

      const missingLatestState =
        error.message.includes("telemetry_latest_state") ||
        error.message.includes("schema cache") ||
        error.message.includes("relation");
      if (!missingLatestState) return json({ error: error.message }, 500);

      const { data: fallback, error: fallbackError } = await db
        .from("enode_telemetry_latest")
        .select("device_id,production_kw,charge_kw,battery_level_pct,connection_status,fault_state,last_seen_at,updated_at")
        .eq("company_id", auth.companyId)
        .order("updated_at", { ascending: false })
        .limit(500);
      if (fallbackError) return json({ error: fallbackError.message }, 500);

      const points = (fallback ?? []).map((row: {
        device_id: string;
        production_kw: number | null;
        charge_kw: number | null;
        battery_level_pct: number | null;
        connection_status: string | null;
        fault_state: string | null;
        last_seen_at: string | null;
        updated_at: string;
      }) => ({
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
      return json({ points, source: "enode_telemetry_latest_fallback" });
    }

    if (req.method === "GET" && path === "/telemetry/site-summary") {
      const siteId = url.searchParams.get("siteId");
      if (!siteId) return json({ error: "siteId required" }, 400);
      const { data, error } = await db
        .from("telemetry_site_summary")
        .select("*")
        .eq("tenant_id", auth.companyId)
        .eq("site_id", siteId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json({ summary: data });
    }

    if (req.method === "GET" && segments[0] === "telemetry" && segments[1]) {
      const hours = Number(url.searchParams.get("hours") ?? "24");
      const since = new Date(Date.now() - hours * 3600_000).toISOString();
      const { data, error } = await db
        .from("enode_telemetry_5m")
        .select("production_kw, charge_kw, grid_kw, bucket_start")
        .eq("company_id", auth.companyId)
        .eq("device_id", segments[1])
        .gte("bucket_start", since)
        .order("bucket_start", { ascending: true })
        .limit(500);
      if (error) return json({ error: error.message }, 500);
      return json({
        points: (data ?? []).map((p: { production_kw: number; charge_kw: number; grid_kw: number; bucket_start: string }) => ({
          production_kw: p.production_kw,
          charge_kw: p.charge_kw,
          grid_kw: p.grid_kw,
          recorded_at: p.bucket_start,
        })),
      });
    }

    if (req.method === "GET" && path === "/connection") {
      const { data } = await db
        .from("enode_connections")
        .select("*")
        .eq("company_id", auth.companyId)
        .maybeSingle();
      return json({ connection: data });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("[enode-api]", err);
    return json(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
}
