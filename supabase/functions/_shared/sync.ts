import { createServiceClient } from "./supabase.ts";
import type { EnodeCharger, EnodeInverter, EnodeWebhookEvent } from "./enode.ts";
import {
  companyIdFromEnodeUser,
  deviceTypeFromEvent,
  enodeUserIdForCompany,
  getCharger,
  getInverter,
  listChargers,
  listInverters,
} from "./enode.ts";

type DeviceRow = {
  company_id: string;
  enode_device_id: string;
  enode_user_id: string;
  device_type: string;
  vendor: string | null;
  display_name: string | null;
  is_reachable: boolean;
  connection_status: string;
  production_rate_kw: number | null;
  charge_rate_kw: number | null;
  battery_level_pct: number | null;
  grid_power_kw: number | null;
  raw_state: Record<string, unknown>;
  last_seen_at: string | null;
};

type QueueRow = {
  id: number;
  delivery_id: string;
  payload: EnodeWebhookEvent;
  attempts: number;
};

function inverterRow(
  companyId: string,
  enodeUserId: string,
  inv: EnodeInverter,
): DeviceRow {
  const rate = inv.productionState?.productionRate ?? null;
  return {
    company_id: companyId,
    enode_device_id: inv.id,
    enode_user_id: enodeUserId,
    device_type: "inverter",
    vendor: inv.vendor ?? null,
    display_name: inv.information?.model ?? inv.vendor ?? "Solar inverter",
    is_reachable: inv.isReachable,
    connection_status: inv.isReachable ? "connected" : "offline",
    production_rate_kw: rate,
    charge_rate_kw: null,
    battery_level_pct: null,
    grid_power_kw: rate != null ? -rate : null,
    raw_state: inv as unknown as Record<string, unknown>,
    last_seen_at: inv.lastSeen ?? null,
  };
}

function chargerRow(
  companyId: string,
  enodeUserId: string,
  ch: EnodeCharger,
): DeviceRow {
  const rate = ch.chargeState?.chargeRate ?? null;
  return {
    company_id: companyId,
    enode_device_id: ch.id,
    enode_user_id: enodeUserId,
    device_type: "charger",
    vendor: ch.vendor ?? null,
    display_name: ch.information?.model ?? ch.vendor ?? "EV charger",
    is_reachable: ch.isReachable,
    connection_status: ch.isReachable ? "connected" : "offline",
    production_rate_kw: null,
    charge_rate_kw: rate,
    battery_level_pct: ch.chargeState?.batteryLevel != null
      ? Math.round(ch.chargeState.batteryLevel)
      : null,
    grid_power_kw: rate,
    raw_state: ch as unknown as Record<string, unknown>,
    last_seen_at: ch.lastSeen ?? null,
  };
}

export async function upsertDevice(row: DeviceRow): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("enode_devices")
    .upsert(
      {
        ...row,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,enode_device_id" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("[enode] upsert device failed", error.message);
    return null;
  }

  const { error: ingestError } = await supabase.rpc("enode_ingest_telemetry", {
    p_company_id: row.company_id,
    p_device_id: data.id,
    p_recorded_at: row.last_seen_at ?? new Date().toISOString(),
    p_production_kw: row.production_rate_kw ?? 0,
    p_charge_kw: row.charge_rate_kw ?? 0,
    p_grid_kw: row.grid_power_kw ?? 0,
    p_battery_level_pct: row.battery_level_pct,
    p_connection_status: row.connection_status,
    p_fault_state: row.connection_status === "error" ? "fault" : null,
    p_power_delta_kw: 0.2,
  });
  if (ingestError) {
    console.error("[enode] telemetry ingest failed", ingestError.message);
  }

  return data.id as string;
}

export async function enqueueWebhookEvent(
  deliveryId: string,
  event: EnodeWebhookEvent,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("enode_webhook_queue").insert({
    delivery_id: deliveryId,
    event_type: event.event,
    enode_user_id: event.user?.id ?? null,
    enode_device_id: event.device?.id ?? event.charger?.id ?? event.action?.targetId ?? null,
    payload: event,
  });
  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

export async function syncCompanyDevices(companyId: string): Promise<number> {
  const enodeUserId = enodeUserIdForCompany(companyId);
  const [inverters, chargers] = await Promise.all([
    listInverters(enodeUserId).catch(() => [] as EnodeInverter[]),
    listChargers(enodeUserId).catch(() => [] as EnodeCharger[]),
  ]);

  let count = 0;
  for (const inv of inverters) {
    await upsertDevice(inverterRow(companyId, enodeUserId, inv));
    count++;
  }
  for (const ch of chargers) {
    await upsertDevice(chargerRow(companyId, enodeUserId, ch));
    count++;
  }

  const supabase = createServiceClient();
  await supabase
    .from("enode_connections")
    .upsert(
      {
        company_id: companyId,
        enode_user_id: enodeUserId,
        link_status: count > 0 ? "linked" : "pending",
        linked_at: count > 0 ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    );

  return count;
}

export async function syncSingleDevice(
  companyId: string,
  enodeDeviceId: string,
  deviceType: string,
): Promise<void> {
  const enodeUserId = enodeUserIdForCompany(companyId);
  if (deviceType === "charger") {
    const ch = await getCharger(enodeUserId, enodeDeviceId);
    await upsertDevice(chargerRow(companyId, enodeUserId, ch));
    return;
  }
  const inv = await getInverter(enodeUserId, enodeDeviceId);
  await upsertDevice(inverterRow(companyId, enodeUserId, inv));
}

export async function handleWebhookEvent(
  deliveryId: string,
  event: EnodeWebhookEvent,
): Promise<void> {
  const supabase = createServiceClient();
  const enodeUserId = event.user?.id ?? "";
  const companyId = companyIdFromEnodeUser(enodeUserId);

  const { error: insertError } = await supabase.from("enode_events").insert({
    company_id: companyId,
    delivery_id: deliveryId,
    event_type: event.event,
    enode_user_id: enodeUserId || null,
    enode_device_id: event.device?.id ?? event.charger?.id ?? event.action?.targetId ?? null,
    payload: event,
  });

  if (insertError?.code === "23505") {
    return;
  }
  if (insertError) {
    throw new Error(insertError.message);
  }

  if (!companyId) return;

  const eventName = event.event;
  if (
    eventName === "user:device:updated" ||
    eventName === "user:device:discovered"
  ) {
    const deviceId = event.device?.id;
    if (!deviceId) {
      await syncCompanyDevices(companyId);
      return;
    }
    const dtype = deviceTypeFromEvent(event);
    try {
      await syncSingleDevice(companyId, deviceId, dtype);
    } catch {
      await syncCompanyDevices(companyId);
    }
    return;
  }

  if (eventName === "charger:action:updated") {
    const targetId = event.action?.targetId ?? event.charger?.id;
    if (targetId) {
      try {
        await syncSingleDevice(companyId, targetId, "charger");
      } catch {
        /* action-only update — event stored */
      }
    }
  }
}

export async function processWebhookQueueBatch(
  limit = 200,
  parallel = 8,
): Promise<{ processed: number; failed: number }> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("enode_webhook_queue")
    .select("id, delivery_id, payload, attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", nowIso)
    .order("received_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as QueueRow[];
  if (rows.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += parallel) {
    const chunk = rows.slice(i, i + parallel);
    await Promise.allSettled(
      chunk.map(async (row) => {
        try {
          await handleWebhookEvent(row.delivery_id, row.payload);
          await supabase
            .from("enode_webhook_queue")
            .update({ status: "processed", processed_at: new Date().toISOString(), last_error: null })
            .eq("id", row.id);
          processed++;
        } catch (err) {
          const attempts = (row.attempts ?? 0) + 1;
          const retrySec = Math.min(300, Math.pow(2, attempts) * 5);
          await supabase
            .from("enode_webhook_queue")
            .update({
              attempts,
              status: attempts >= 8 ? "failed" : "pending",
              next_attempt_at: new Date(Date.now() + retrySec * 1000).toISOString(),
              last_error: err instanceof Error ? err.message : String(err),
            })
            .eq("id", row.id);
          failed++;
        }
      }),
    );
  }

  return { processed, failed };
}
