import { createServiceClient } from "./supabase.ts";
import {
  dataListToMap,
  fetchSolarmanDeviceCurrentData,
  fetchSolarmanStationRealtime,
  listSolarmanStationDevices,
  listSolarmanStations,
  mapSolarmanDeviceState,
  solarmanDeviceExternalId,
  solarmanUserIdForCompany,
  wattsToKw,
  type SolarmanStation,
} from "./solarman.ts";

function pickNumeric(map: Map<string, string>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = map.get(key);
    if (raw == null || raw === "") continue;
    const value = Number(raw);
    if (!Number.isNaN(value)) return value;
  }
  return null;
}

async function upsertSolarmanDevice(input: {
  companyId: string;
  solarmanUserId: string;
  deviceId: number;
  deviceSn: string;
  deviceType: string;
  displayName: string;
  productionKw: number;
  loadKw: number;
  batteryPct: number | null;
  temperatureC: number | null;
  connectionStatus: string;
  reachable: boolean;
  rawState: Record<string, unknown>;
  recordedAt: string;
  siteId: string | null;
}): Promise<string | null> {
  const supabase = createServiceClient();
  const externalId = solarmanDeviceExternalId(input.deviceId);

  const { data, error } = await supabase
    .from("enode_devices")
    .upsert(
      {
        company_id: input.companyId,
        enode_device_id: externalId,
        enode_user_id: input.solarmanUserId,
        device_type: input.deviceType.toLowerCase().includes("battery") ? "battery" : "inverter",
        vendor: "Solarman",
        display_name: input.displayName,
        is_reachable: input.reachable,
        connection_status: input.connectionStatus,
        production_rate_kw: input.productionKw,
        charge_rate_kw: null,
        battery_level_pct: input.batteryPct,
        grid_power_kw: input.loadKw,
        raw_state: input.rawState,
        last_seen_at: input.recordedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id,enode_device_id" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("[solarman] upsert device failed", error.message);
    return null;
  }

  const dbDeviceId = data.id as string;

  await supabase.rpc("enode_ingest_telemetry", {
    p_company_id: input.companyId,
    p_device_id: dbDeviceId,
    p_recorded_at: input.recordedAt,
    p_production_kw: input.productionKw,
    p_charge_kw: 0,
    p_grid_kw: input.loadKw,
    p_battery_level_pct: input.batteryPct,
    p_connection_status: input.connectionStatus,
    p_fault_state: input.connectionStatus === "error" ? "fault" : null,
    p_power_delta_kw: 0.2,
  });

  if (input.siteId) {
    const hashBase = [
      input.companyId,
      input.siteId,
      dbDeviceId,
      input.productionKw.toFixed(4),
      input.loadKw.toFixed(4),
      input.batteryPct ?? "null",
      input.recordedAt,
    ].join("|");
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(hashBase));
    const telemetryHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await supabase.rpc("ingest_telemetry_log", {
      p_tenant_id: input.companyId,
      p_site_id: input.siteId,
      p_device_id: dbDeviceId,
      p_solar_output_kw: input.productionKw,
      p_load_draw_kw: input.loadKw,
      p_battery_soc_percent: input.batteryPct,
      p_battery_voltage: null,
      p_inverter_status: input.reachable ? "online" : "offline",
      p_grid_status: input.connectionStatus,
      p_generator_status: "unknown",
      p_inverter_temperature: input.temperatureC,
      p_daily_energy_kwh: null,
      p_total_energy_kwh: null,
      p_fault_code: input.connectionStatus === "error" ? "solarman_alert" : null,
      p_warning_code: null,
      p_raw_payload: input.rawState,
      p_telemetry_hash: telemetryHash,
      p_system_timestamp: input.recordedAt,
      p_delta_threshold: 0.2,
    });
  }

  return dbDeviceId;
}

export async function syncSolarmanCompany(companyId: string): Promise<{
  stations: number;
  devices: number;
}> {
  const supabase = createServiceClient();
  const { data: connection, error: connectionError } = await supabase
    .from("solarman_connections")
    .select("company_id, access_token, org_id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (connectionError) throw new Error(connectionError.message);
  if (!connection?.access_token) throw new Error("Solarman is not connected");

  try {
    const result = await syncSolarmanCompanyWithToken(companyId, connection.access_token);
    await supabase
      .from("solarman_connections")
      .update({
        link_status: "linked",
        last_sync_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Solarman sync failed";
    await supabase
      .from("solarman_connections")
      .update({
        link_status: "error",
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId);
    throw err;
  }
}

async function syncSolarmanCompanyWithToken(
  companyId: string,
  token: string,
): Promise<{ stations: number; devices: number }> {
  const supabase = createServiceClient();
  const solarmanUserId = solarmanUserIdForCompany(companyId);

  const remote = await listSolarmanStations(token, 1, 100);
  let stationCount = 0;
  let deviceCount = 0;

  for (const station of remote.stations) {
    await upsertSolarmanStationRow(companyId, station);
    stationCount += 1;
  }

  const { data: linkedStations } = await supabase
    .from("solarman_stations")
    .select("solarman_station_id, site_id, name")
    .eq("company_id", companyId)
    .not("site_id", "is", null);

  for (const linked of linkedStations ?? []) {
    const realtime = await fetchSolarmanStationRealtime(token, linked.solarman_station_id).catch(() => ({}));
    const stationBattery =
      typeof realtime.batterySoc === "number"
        ? Math.round(realtime.batterySoc)
        : typeof realtime.batterySoc === "string"
          ? Math.round(Number(realtime.batterySoc))
          : null;

    const devices = await listSolarmanStationDevices(token, linked.solarman_station_id, 1, 100);
    for (const device of devices.devices) {
      const current = await fetchSolarmanDeviceCurrentData(token, device.deviceId, device.deviceSn).catch(
        () => ({ dataList: [], deviceState: device.connectStatus }),
      );
      const map = dataListToMap(current.dataList);
      const productionKw = wattsToKw(
        map.get("APo_t1") ?? map.get("DPi_t1") ?? map.get("PG_Pt1") ?? undefined,
      );
      const loadKw = Math.abs(wattsToKw(map.get("PG_Pt1") ?? map.get("usePower") ?? undefined));
      const temperatureC = pickNumeric(map, ["INV_T0", "T_INV"]);
      const batteryPct = stationBattery;
      const mapped = mapSolarmanDeviceState(current.deviceState ?? device.connectStatus);
      const recordedAt = new Date().toISOString();

      const inserted = await upsertSolarmanDevice({
        companyId,
        solarmanUserId,
        deviceId: device.deviceId,
        deviceSn: device.deviceSn,
        deviceType: device.deviceType,
        displayName: `${linked.name} · ${device.deviceType}`,
        productionKw,
        loadKw,
        batteryPct,
        temperatureC,
        connectionStatus: mapped.connectionStatus,
        reachable: mapped.reachable,
        rawState: {
          stationId: linked.solarman_station_id,
          device,
          current,
          realtime,
        },
        recordedAt,
        siteId: linked.site_id,
      });

      if (inserted) deviceCount += 1;
    }
  }

  return { stations: stationCount, devices: deviceCount };
}

export async function syncAllLinkedSolarmanCompanies(): Promise<{
  companies: number;
  synced: number;
  failed: number;
  devices: number;
  errors: Array<{ companyId: string; error: string }>;
}> {
  const supabase = createServiceClient();
  const { data: connections, error } = await supabase
    .from("solarman_connections")
    .select("company_id, access_token, link_status")
    .eq("link_status", "linked")
    .not("access_token", "is", null);

  if (error) throw new Error(error.message);

  let synced = 0;
  let failed = 0;
  let devices = 0;
  const errors: Array<{ companyId: string; error: string }> = [];

  for (const row of connections ?? []) {
    if (!row.access_token) continue;
    try {
      const result = await syncSolarmanCompanyWithToken(row.company_id, row.access_token);
      synced += 1;
      devices += result.devices;
      await supabase
        .from("solarman_connections")
        .update({
          last_sync_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", row.company_id);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : "Sync failed";
      errors.push({ companyId: row.company_id, error: message });
      await supabase
        .from("solarman_connections")
        .update({
          link_status: "error",
          last_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", row.company_id);
    }
  }

  return {
    companies: connections?.length ?? 0,
    synced,
    failed,
    devices,
    errors,
  };
}

async function upsertSolarmanStationRow(companyId: string, station: SolarmanStation): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("solarman_stations").upsert(
    {
      company_id: companyId,
      solarman_station_id: station.id,
      name: station.name,
      installed_capacity: station.installedCapacity ?? null,
      location_address: station.locationAddress ?? null,
      location_lat: station.locationLat ?? null,
      location_lng: station.locationLng ?? null,
      network_status: station.networkStatus ?? null,
      battery_soc: station.batterySoc ?? null,
      raw_state: station as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,solarman_station_id" },
  );
}

export async function linkSolarmanStation(
  companyId: string,
  stationId: number,
  siteId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("solarman_stations")
    .update({
      site_id: siteId,
      linked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("solarman_station_id", stationId);

  if (error) throw new Error(error.message);
}
