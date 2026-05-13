import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to realtime changes on power_logs / security_alerts / facilities
 * and invalidates the AURA dashboard caches.
 */
export function useRealtimeTelemetry() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("aura-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "power_logs" },
        () => {
          qc.invalidateQueries({ queryKey: ["diesel-burden"] });
          qc.invalidateQueries({ queryKey: ["daily-offset"] });
          qc.invalidateQueries({ queryKey: ["latest-power-logs"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "security_alerts" },
        () => qc.invalidateQueries({ queryKey: ["security-alerts"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        () => {
          qc.invalidateQueries({ queryKey: ["facilities"] });
          qc.invalidateQueries({ queryKey: ["latest-power-logs"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
