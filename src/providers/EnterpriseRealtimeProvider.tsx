import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyId } from "@/hooks/useCompanyId";
import { ENODE_DEVICES_KEY } from "@/hooks/useEnodeDevices";
import { enodeDeviceKey } from "@/hooks/useEnodeDevice";
import type { EnodeDevice } from "@/services/enode.types";

type EnodeEventRow = { event_type?: string };

const PUBLIC_PATHS = new Set(["/welcome", "/login", "/register"]);

function isPublicMarketingRoute(): boolean {
  if (typeof window === "undefined") return false;
  return PUBLIC_PATHS.has(window.location.pathname);
}

/**
 * One Realtime channel per company. All `.on()` handlers are chained before `.subscribe()`.
 * Skipped on /welcome (and other public routes) so marketing pages never hit Realtime errors.
 */
export function EnterpriseRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { data: companyId, isLoading: companyLoading } = useCompanyId();
  const queryClient = useQueryClient();
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  useEffect(() => {
    if (!session || companyLoading || isPublicMarketingRoute()) return;

    const scope = companyId ?? "unscoped";
    const channelName = `realtime:enode-web-${scope}`;
    const companyFilter = companyId ? `company_id=eq.${companyId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "enode_devices",
          ...(companyFilter ? { filter: companyFilter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<EnodeDevice>) => {
          const row = payload.new as EnodeDevice | null;
          if (row?.id) {
            queryClientRef.current.setQueryData(enodeDeviceKey(row.id), row);
          }
          void queryClientRef.current.invalidateQueries({ queryKey: ENODE_DEVICES_KEY });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "enode_events",
          ...(companyFilter ? { filter: companyFilter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<EnodeEventRow>) => {
          const row = payload.new as EnodeEventRow | null;
          if (!row?.event_type) return;
          if (row.event_type.includes("device")) toast.info("Device status updated");
          if (row.event_type === "charger:action:updated") toast.success("Charger action completed");
          void queryClientRef.current.invalidateQueries({ queryKey: ENODE_DEVICES_KEY });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "enode_telemetry_snapshots",
          ...(companyFilter ? { filter: companyFilter } : {}),
        },
        (payload) => {
          const row = payload.new as { device_id?: string } | null;
          if (row?.device_id) {
            void queryClientRef.current.invalidateQueries({
              queryKey: ["enode", "telemetry", row.device_id],
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, companyId, companyLoading]);

  return <>{children}</>;
}
