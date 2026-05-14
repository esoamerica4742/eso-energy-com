import { supabase } from "@/integrations/supabase/client";

export type Facility = {
  id: string;
  client_id: string;
  facility_name: string;
  location_state: string;
  status: string;
};

export type PowerLog = {
  id: number;
  facility_id: string;
  solar_generation_kw: number;
  load_consumption_kw: number;
  battery_percentage: number;
  battery_temperature_c: number;
  grid_status: string;
  diesel_saved_naira: number;
  logged_at: string;
};

export type SecurityAlert = {
  id: string;
  facility_id: string;
  alert_type: string;
  message: string;
  severity: string;
  is_resolved: boolean;
  created_at: string;
};

/** Returns branches the signed-in user's company owns, mapped to the legacy Facility shape. */
export async function fetchFacilities(): Promise<Facility[]> {
  const { data, error } = await supabase
    .from("branches")
    .select("id, company_id, name, location_state, status")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((b) => ({
    id: b.id,
    client_id: b.company_id ?? "",
    facility_name: b.name,
    location_state: b.location_state ?? "",
    status: b.status ?? "online",
  }));
}

async function facilityIds(): Promise<string[]> {
  const list = await fetchFacilities();
  return list.map((f) => f.id);
}

/** Latest energy_metrics row per branch for the company. */
export async function fetchLatestPowerLogs(): Promise<
  Array<{ facility: Facility; log: PowerLog | null }>
> {
  const facilities = await fetchFacilities();
  if (facilities.length === 0) return [];
  const ids = facilities.map((f) => f.id);
  const { data, error } = await supabase
    .from("energy_metrics")
    .select(
      "id, branch_id, solar_generation_kw, load_consumption_kw, battery_percentage, battery_temperature_c, grid_status, diesel_saved_naira, logged_at",
    )
    .in("branch_id", ids)
    .order("logged_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const latest = new Map<string, PowerLog>();
  for (const row of (data ?? []) as Array<{
    id: number; branch_id: string; solar_generation_kw: number; load_consumption_kw: number;
    battery_percentage: number; battery_temperature_c: number; grid_status: string;
    diesel_saved_naira: number; logged_at: string;
  }>) {
    if (!latest.has(row.branch_id)) {
      latest.set(row.branch_id, {
        id: row.id,
        facility_id: row.branch_id,
        solar_generation_kw: Number(row.solar_generation_kw),
        load_consumption_kw: Number(row.load_consumption_kw),
        battery_percentage: row.battery_percentage,
        battery_temperature_c: Number(row.battery_temperature_c),
        grid_status: row.grid_status,
        diesel_saved_naira: Number(row.diesel_saved_naira),
        logged_at: row.logged_at,
      });
    }
  }
  return facilities.map((f) => ({ facility: f, log: latest.get(f.id) ?? null }));
}

/** Sum diesel_saved_naira over the last 24h for the company. */
export async function fetchDailyOffsetNaira(): Promise<number> {
  const ids = await facilityIds();
  if (ids.length === 0) return 0;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("energy_metrics")
    .select("diesel_saved_naira")
    .in("branch_id", ids)
    .gte("logged_at", since);
  if (error) throw error;
  return (data ?? []).reduce(
    (acc, r: { diesel_saved_naira: number | null }) =>
      acc + Number(r.diesel_saved_naira ?? 0),
    0,
  );
}

/** Security alerts table is not part of the new B2B schema; return empty. */
export async function fetchActiveAlerts(_limit = 6): Promise<SecurityAlert[]> {
  return [];
}
