import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime INSERTs on power_logs / security_alerts / facilities
 * and invalidates the relevant React Query caches so the dashboards animate
 * without a page refresh.
 *
 * Tables that don't exist or aren't on the realtime publication will silently
 * no-op — the rest of the channels keep working.
 */
export function useRealtimeTelemetry() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("aura-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "power_logs" },
        () => qc.invalidateQueries({ queryKey: ["diesel-burden"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "security_alerts" },
        () => qc.invalidateQueries({ queryKey: ["security-alerts"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        () => qc.invalidateQueries({ queryKey: ["facilities"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
