import type { DieselDay } from "@/components/aura/DieselBurden";
import { supabase, ENTERPRISE_CLIENT_ID } from "@/integrations/supabase/client";

const DAY_LABEL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const NAIRA_PER_LITER = 1180;

/**
 * Reads the last 7 days of power_logs for the enterprise client's facilities
 * and aggregates `diesel_saved_naira` into liters avoided per day.
 * Returns [] when there is no data — caller renders the empty state.
 */
export async function fetchDieselWeek(): Promise<DieselDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const { data: facilities, error: fErr } = await supabase
    .from("facilities")
    .select("id")
    .eq("client_id", ENTERPRISE_CLIENT_ID);
  if (fErr) throw fErr;
  const ids = (facilities ?? []).map((f: { id: string }) => f.id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("power_logs")
    .select("logged_at, diesel_saved_naira")
    .in("facility_id", ids)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const buckets = new Map<string, DieselDay>();
  for (let i = 0; i < 7; i++) {
    const dt = new Date(since);
    dt.setDate(since.getDate() + i);
    const key = dt.toISOString().slice(0, 10);
    buckets.set(key, { d: DAY_LABEL[dt.getDay()], v: 0 });
  }
  for (const row of data as Array<{ logged_at: string; diesel_saved_naira: number | null }>) {
    const key = row.logged_at?.slice(0, 10);
    const bucket = key ? buckets.get(key) : null;
    if (!bucket) continue;
    bucket.v += Math.round(Number(row.diesel_saved_naira ?? 0) / NAIRA_PER_LITER);
  }
  const week = Array.from(buckets.values());
  return week.some((b) => b.v > 0) ? week : [];
}
