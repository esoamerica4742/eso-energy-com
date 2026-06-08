import type { EnodeDevice, EnodeTelemetryPoint } from "@/services/enode.types";

export type FleetPowerTotals = { solarKw: number; loadKw: number };

export function computeSystemEfficiency(params: {
  solarKw: number;
  loadKw: number;
  productionKw?: number | null;
  gridPowerKw?: number | null;
}): number {
  const { solarKw, loadKw, productionKw, gridPowerKw } = params;
  if (productionKw != null && productionKw > 0) {
    const total = productionKw + Math.abs(gridPowerKw ?? 0);
    if (total > 0) return Math.min(100, Math.round((productionKw / total) * 1000) / 10);
  }
  if (loadKw > 0.05 && solarKw > 0) {
    return Math.min(100, Math.round((solarKw / loadKw) * 1000) / 10);
  }
  return 0;
}

export function pickPrimaryInverter(devices: EnodeDevice[]): EnodeDevice | null {
  const inverters = devices.filter((d) => d.device_type === "inverter");
  if (inverters.length > 0) return inverters[0];
  return devices[0] ?? null;
}

export function sumInverterLoadKw(devices: EnodeDevice[]): number {
  return devices
    .filter((d) => d.device_type === "inverter")
    .reduce((acc, d) => {
      const kw =
        d.production_rate_kw ??
        d.charge_rate_kw ??
        (d.grid_power_kw != null ? Math.abs(d.grid_power_kw) : 0);
      return acc + Number(kw ?? 0);
    }, 0);
}

export function resolveArrayLoadKw(params: {
  devices: EnodeDevice[];
  fleet: FleetPowerTotals;
  primary: EnodeDevice | null;
}): number {
  const fromInverters = sumInverterLoadKw(params.devices);
  if (fromInverters > 0) return fromInverters;
  const primaryKw =
    params.primary?.production_rate_kw ??
    params.primary?.charge_rate_kw ??
    (params.primary?.grid_power_kw != null ? Math.abs(params.primary.grid_power_kw) : null);
  if (primaryKw != null && primaryKw > 0) return Number(primaryKw);
  if (params.fleet.loadKw > 0) return params.fleet.loadKw;
  return params.fleet.solarKw;
}

export function isEnodeLive(device: EnodeDevice | null): boolean {
  return Boolean(device?.is_reachable && device.connection_status === "connected" && device.last_seen_at);
}

export function telemetrySeriesForPulse(points: EnodeTelemetryPoint[]): number[] {
  return points.map((p) => Number(p.production_kw ?? p.grid_kw ?? 0));
}
