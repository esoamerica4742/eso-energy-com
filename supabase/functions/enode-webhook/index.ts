/**
 * Enode webhook receiver — verifies signatures, persists events, syncs devices.
 * Deploy: supabase functions deploy enode-webhook --no-verify-jwt
 */
import { verifyWebhookSignature } from "../_shared/enode.ts";
import type { EnodeWebhookEvent } from "../_shared/enode.ts";
import { enqueueWebhookEvent, processWebhookQueueBatch } from "../_shared/sync.ts";
import { jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();
  const deliveryId = req.headers.get("x-enode-delivery") ?? crypto.randomUUID();
  const signature = req.headers.get("x-enode-signature");

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    console.warn("[enode-webhook] invalid signature", deliveryId);
    return jsonResponse({ error: "Invalid signature" }, 401);
  }

  let payload: EnodeWebhookEvent[] | EnodeWebhookEvent;
  try {
    payload = JSON.parse(rawBody) as EnodeWebhookEvent[] | EnodeWebhookEvent;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const events = Array.isArray(payload) ? payload : [payload];

  try {
    for (let i = 0; i < events.length; i++) {
      const dedupeId = events.length > 1 ? `${deliveryId}:${i}` : deliveryId;
      await enqueueWebhookEvent(dedupeId, events[i]);
    }
    // Fire and forget best-effort queue drain.
    void processWebhookQueueBatch(50, 6);
    return jsonResponse({ received: true, count: events.length, queued: true }, 202);
  } catch (err) {
    console.error("[enode-webhook]", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Processing failed" },
      500,
    );
  }
});
