import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getServerEnv } from "@/lib/env";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getEnodeAccessToken, isEnodeConfigured } from "@/lib/enode-server/enode";

type CheckStatus = "pass" | "warn" | "fail";

type CheckResult = {
  status: CheckStatus;
  message: string;
  latencyMs?: number;
};

type HealthPayload = {
  ok: boolean;
  overall: CheckStatus;
  timestamp: string;
  checks: {
    env: CheckResult;
    supabase: CheckResult;
    enodeConfig: CheckResult;
    enodeProbe: CheckResult;
  };
};

function statusFromChecks(checks: CheckResult[]): CheckStatus {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
}

export const APIRoute = createAPIFileRoute("/api/health/enterprise")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const shouldProbeEnode = url.searchParams.get("probe") === "enode";

    let envCheck: CheckResult = {
      status: "pass",
      message: "Server environment schema is valid",
    };
    try {
      getServerEnv();
    } catch (error) {
      envCheck = {
        status: "fail",
        message: error instanceof Error ? error.message : "Invalid server environment",
      };
    }

    const supabaseStart = Date.now();
    let supabaseCheck: CheckResult = {
      status: "pass",
      message: "Supabase service-role access is healthy",
    };
    try {
      const { error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      if (error) {
        supabaseCheck = {
          status: "fail",
          message: `Supabase health check failed: ${error.message}`,
          latencyMs: Date.now() - supabaseStart,
        };
      } else {
        supabaseCheck.latencyMs = Date.now() - supabaseStart;
      }
    } catch (error) {
      supabaseCheck = {
        status: "fail",
        message:
          error instanceof Error
            ? `Supabase health check failed: ${error.message}`
            : "Supabase health check failed",
        latencyMs: Date.now() - supabaseStart,
      };
    }

    const enodeConfigured = isEnodeConfigured();
    const enodeConfigCheck: CheckResult = enodeConfigured
      ? { status: "pass", message: "Enode server credentials are configured" }
      : {
          status: "warn",
          message:
            "Enode credentials are missing (ENODE_CLIENT_ID / ENODE_CLIENT_SECRET / ENODE_WEBHOOK_SECRET)",
        };

    let enodeProbeCheck: CheckResult = {
      status: "warn",
      message: shouldProbeEnode
        ? "Enode probe skipped because Enode is not configured"
        : "Enode probe not requested (append ?probe=enode)",
    };

    if (shouldProbeEnode && enodeConfigured) {
      const probeStart = Date.now();
      try {
        await getEnodeAccessToken();
        enodeProbeCheck = {
          status: "pass",
          message: "Enode OAuth token probe succeeded",
          latencyMs: Date.now() - probeStart,
        };
      } catch (error) {
        enodeProbeCheck = {
          status: "fail",
          message:
            error instanceof Error
              ? `Enode probe failed: ${error.message}`
              : "Enode probe failed",
          latencyMs: Date.now() - probeStart,
        };
      }
    }

    const checks = {
      env: envCheck,
      supabase: supabaseCheck,
      enodeConfig: enodeConfigCheck,
      enodeProbe: enodeProbeCheck,
    };

    const overall = statusFromChecks(Object.values(checks));
    const payload: HealthPayload = {
      ok: overall !== "fail",
      overall,
      timestamp: new Date().toISOString(),
      checks,
    };

    return Response.json(payload, { status: overall === "fail" ? 503 : 200 });
  },
});
