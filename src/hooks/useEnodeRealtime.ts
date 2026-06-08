import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EnodeDevice } from "@/services/enode.types";

type DevicePatch = Partial<EnodeDevice>;

type Options = {
  /** Prefer EnterpriseRealtimeProvider for app-wide Enode updates. */
  enabled?: boolean;
  deviceId?: string;
  companyId?: string;
  onDevicePatch?: (patch: DevicePatch) => void;
  onEvent?: (eventType: string) => void;
};

/**
 * Scoped Realtime hook — all `.on()` handlers are registered before `.subscribe()`.
 * Channel name includes scope so effect re-runs never reuse a subscribed channel.
 */
export function useEnodeRealtime({
  enabled = true,
  deviceId,
  companyId,
  onDevicePatch,
  onEvent,
}: Options) {
  const onDeviceRef = useRef(onDevicePatch);
  const onEventRef = useRef(onEvent);
  onDeviceRef.current = onDevicePatch;
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const scope = deviceId ?? companyId ?? "pending";
    const channelName = `realtime:enode-web-${scope}`;

    const deviceFilter = deviceId
      ? `id=eq.${deviceId}`
      : companyId
        ? `company_id=eq.${companyId}`
        : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enode_devices",
          ...(deviceFilter ? { filter: deviceFilter } : {}),
        },
        (payload) => {
          const row = payload.new as EnodeDevice | null;
          if (row) onDeviceRef.current?.(row);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "enode_events",
          ...(companyId ? { filter: `company_id=eq.${companyId}` } : {}),
        },
        (payload) => {
          const row = payload.new as { event_type?: string };
          if (row?.event_type) onEventRef.current?.(row.event_type);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, deviceId, companyId]);
}
