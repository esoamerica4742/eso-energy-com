import { useMemo } from "react";
import { useEnodeDevices } from "@/hooks/useEnodeDevices";
import { useEnodeDevice } from "@/hooks/useEnodeDevice";
import { useEnodeTelemetry } from "@/hooks/useEnodeTelemetry";
import { useFleetPower } from "@/hooks/useFleetPower";
import { useAuth } from "@/hooks/useAuth";
import { supabaseConfigured } from "@/lib/supabase-config";
import { LANDING_INVERTER_DEMO } from "@/lib/landingDemo";
import {
  computeSystemEfficiency,
  isEnodeLive,
  pickPrimaryInverter,
  resolveArrayLoadKw,
} from "@/lib/inverterMetrics";
import { enodeClient } from "@/services/enode";
import type { EnodeTelemetryPoint } from "@/services/enode.types";

export function useInverterIntelligence(enabled: boolean) {
  const { session, loading: authLoading } = useAuth();
  const isAuthenticated = Boolean(session);
  const enodeEnabled = enabled && supabaseConfigured && isAuthenticated;

  const devicesQuery = useEnodeDevices({ syncOnMount: enodeEnabled });
  const devices = devicesQuery.data ?? [];
  const primary = useMemo(() => pickPrimaryInverter(devices), [devices]);
  const primaryId = primary?.id;

  const deviceQuery = useEnodeDevice(enodeEnabled ? primaryId : undefined);
  const device = deviceQuery.data ?? primary ?? null;
  const telemetryQuery = useEnodeTelemetry(enodeEnabled ? primaryId : null, 24);
  const fleetQuery = useFleetPower(enabled);
  const fleet = fleetQuery.data ?? { solarKw: 0, loadKw: 0 };

  const loadKw = useMemo(() => {
    if (!enabled) return LANDING_INVERTER_DEMO.loadKw;
    const resolved = resolveArrayLoadKw({ devices, fleet, primary: device });
    return resolved > 0 ? resolved : LANDING_INVERTER_DEMO.loadKw;
  }, [enabled, devices, fleet, device]);

  const efficiencyPct = useMemo(() => {
    if (!enabled) return LANDING_INVERTER_DEMO.efficiencyPct;
    const pct = computeSystemEfficiency({
      solarKw: fleet.solarKw,
      loadKw: fleet.loadKw,
      productionKw: device?.production_rate_kw,
      gridPowerKw: device?.grid_power_kw,
    });
    return pct > 0 ? pct : LANDING_INVERTER_DEMO.efficiencyPct;
  }, [enabled, fleet, device]);

  const isLive = enabled && isEnodeLive(device);
  const points: EnodeTelemetryPoint[] = telemetryQuery.data ?? [];
  const needsSignIn = enabled && supabaseConfigured && !isAuthenticated && !authLoading;
  const needsLink = enabled && enodeEnabled && !devicesQuery.isLoading && devices.length === 0;

  const sync = async () => {
    if (!enodeEnabled) return;
    await enodeClient.syncAll();
    await devicesQuery.refetch();
  };

  return {
    loadKw,
    efficiencyPct,
    isLive,
    points,
    device,
    isLoading:
      enabled &&
      (authLoading ||
        (enodeEnabled && (devicesQuery.isLoading || deviceQuery.isLoading)) ||
        fleetQuery.isLoading),
    needsSignIn,
    needsLink,
    sync,
    refetch: async () => {
      await Promise.all([devicesQuery.refetch(), fleetQuery.refetch(), telemetryQuery.refetch()]);
    },
  };
}
