import { createAPIFileRoute } from "@tanstack/react-start/api";
import {
  verifyWebhookSignature, type EnodeWebhookEvent,
} from "@/lib/enode-server/enode";
import { enqueueWebhookEvent, processWebhookQueueBatch } from "@/lib/enode-server/sync";
import { ensureEnodeEnv } from "@/lib/enode-server/env";

export const APIRoute = createAPIFileRoute("/api/enode/webhook")({
  POST: async ({ request }) => {
    ensureEnodeEnv();
    const rawBody = await request.text();
    const deliveryId =
      request.headers.get("x-enode-delivery") ?? crypto.randomUUID();
    const signature = request.headers.get("x-enode-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: EnodeWebhookEvent[] | EnodeWebhookEvent;
    try {
      payload = JSON.parse(rawBody) as EnodeWebhookEvent[] | EnodeWebhookEvent;
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const events = Array.isArray(payload) ? payload : [payload];
    try {
      for (let i = 0; i < events.length; i++) {
        const dedupeId = events.length > 1 ? `${deliveryId}:${i}` : deliveryId;
        await enqueueWebhookEvent(dedupeId, events[i]);
      }

      // Optional inline draining for low traffic environments.
      if ((process.env.ENODE_WEBHOOK_INLINE_PROCESS ?? "false") === "true") {
        void processWebhookQueueBatch(50, 6);
      }

      return Response.json({ received: true, count: events.length, queued: true }, { status: 202 });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Processing failed" },
        { status: 500 },
      );
    }
  },
});
