import { useQuery } from "@tanstack/react-query";
import { fetchLatestPowerLogs } from "@/lib/aura";
import type { FleetPowerTotals } from "@/lib/inverterMetrics";
import { LANDING_FLEET_DEMO } from "@/lib/landingDemo";
import { useAuth } from "@/hooks/useAuth";
import { supabaseConfigured } from "@/lib/supabase-config";

export const FLEET_POWER_KEY = ["fleet-power"] as const;

function aggregateFleet(rows: Awaited<ReturnType<typeof fetchLatestPowerLogs>>): FleetPowerTotals {
  return rows.reduce(
    (acc, { log }) => {
      if (!log) return acc;
      acc.solarKw += Number(log.solar_generation_kw ?? 0);
      acc.loadKw += Number(log.load_consumption_kw ?? 0);
      return acc;
    },
    { solarKw: 0, loadKw: 0 },
  );
}

export function useFleetPower(enabled: boolean) {
  const { session } = useAuth();
  const isAuthenticated = Boolean(session);

  return useQuery({
    queryKey: FLEET_POWER_KEY,
    queryFn: async () => aggregateFleet(await fetchLatestPowerLogs()),
    enabled: enabled && supabaseConfigured && isAuthenticated,
    staleTime: 30_000,
    placeholderData: LANDING_FLEET_DEMO,
  });
}
