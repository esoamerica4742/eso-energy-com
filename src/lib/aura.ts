import { supabase, ENTERPRISE_CLIENT_ID } from "@/integrations/supabase/client";

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

export async function fetchFacilities(): Promise<Facility[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select("id, client_id, facility_name, location_state, status")
    .eq("client_id", ENTERPRISE_CLIENT_ID)
    .order("facility_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Facility[];
}

async function facilityIds(): Promise<string[]> {
  const list = await fetchFacilities();
  return list.map((f) => f.id);
}

/** Latest power_log per facility for the enterprise client. */
export async function fetchLatestPowerLogs(): Promise<
  Array<{ facility: Facility; log: PowerLog | null }>
> {
  const facilities = await fetchFacilities();
  if (facilities.length === 0) return [];
  const ids = facilities.map((f) => f.id);
  const { data, error } = await supabase
    .from("power_logs")
    .select(
      "id, facility_id, solar_generation_kw, load_consumption_kw, battery_percentage, battery_temperature_c, grid_status, diesel_saved_naira, logged_at",
    )
    .in("facility_id", ids)
    .order("logged_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const latest = new Map<string, PowerLog>();
  for (const row of (data ?? []) as PowerLog[]) {
    if (!latest.has(row.facility_id)) latest.set(row.facility_id, row);
  }
  return facilities.map((f) => ({ facility: f, log: latest.get(f.id) ?? null }));
}

/** Sum diesel_saved_naira over the last 24h for the client. */
export async function fetchDailyOffsetNaira(): Promise<number> {
  const ids = await facilityIds();
  if (ids.length === 0) return 0;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("power_logs")
    .select("diesel_saved_naira")
    .in("facility_id", ids)
    .gte("logged_at", since);
  if (error) throw error;
  return (data ?? []).reduce(
    (acc, r: { diesel_saved_naira: number | null }) =>
      acc + Number(r.diesel_saved_naira ?? 0),
    0,
  );
}

export async function fetchActiveAlerts(limit = 6): Promise<SecurityAlert[]> {
  const ids = await facilityIds();
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("security_alerts")
    .select("id, facility_id, alert_type, message, severity, is_resolved, created_at")
    .in("facility_id", ids)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SecurityAlert[];
}
