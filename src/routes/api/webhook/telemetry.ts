import { randomUUID } from "node:crypto";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import {
  ingestTelemetryWebhook,
  verifyTelemetrySignature,
} from "@/lib/telemetry/ingest";
import type { TelemetryWebhookPayload } from "@/lib/telemetry/types";
import { logEvent, traceAsync } from "@/lib/observability/trace";

export const APIRoute = createAPIFileRoute("/api/webhook/telemetry")({
  POST: async ({ request }) => {
    const start = Date.now();
    const traceId = request.headers.get("x-trace-id") ?? randomUUID();
    const sourceHeader = (request.headers.get("x-telemetry-source") ?? "").toLowerCase();
    const source = sourceHeader === "solarman" ? "solarman" : "enode";
    const signature =
      request.headers.get("x-solarman-signature") ??
      request.headers.get("x-enode-signature") ??
      request.headers.get("x-signature");

    const rawBody = await request.text();
    if (!verifyTelemetrySignature(source, rawBody, signature)) {
      logEvent("warn", "telemetry.signature.invalid", { traceId, source });
      return Response.json(
        {
          ok: false,
          error: "Invalid signature",
          traceId,
          latencyMs: Date.now() - start,
        },
        { status: 401 },
      );
    }

    let payload: TelemetryWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as TelemetryWebhookPayload;
    } catch {
      return Response.json(
        {
          ok: false,
          error: "Invalid JSON payload",
          traceId,
          latencyMs: Date.now() - start,
        },
        { status: 400 },
      );
    }

    try {
      const result = await traceAsync(
        "telemetry.ingest",
        traceId,
        () => ingestTelemetryWebhook(payload, { traceId, allowStaleCache: true }),
        { source, tenantId: payload.tenant_id, deviceId: payload.device_id },
      );
      return Response.json(
        {
          ok: true,
          traceId: result.traceId,
          cacheHit: result.cacheHit,
          persisted: result.persisted,
          changed: result.changed,
          changedFields: result.changedFields,
          staleRevalidated: result.staleRevalidated,
          latencyMs: result.latencyMs,
          syncIntervalMs: 300_000,
        },
        { status: 202 },
      );
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Telemetry ingestion failed",
          traceId,
          latencyMs: Date.now() - start,
        },
        { status: 500 },
      );
    }
  },
});
