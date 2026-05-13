import type { DieselDay } from "@/components/aura/DieselBurden";
import { supabase, ENTERPRISE_CLIENT_ID } from "@/integrations/supabase/client";

const FALLBACK: DieselDay[] = [
  { d: "MON", v: 218 }, { d: "TUE", v: 246 }, { d: "WED", v: 271 },
  { d: "THU", v: 252 }, { d: "FRI", v: 289 }, { d: "SAT", v: 264 },
  { d: "SUN", v: 300 },
];

const DAY_LABEL = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * Reads the last 7 days of power_logs and aggregates `liters_avoided`
 * (or `diesel_offset_liters`) per day for the enterprise client.
 * Falls back to the in-memory dataset if the table/columns are missing
 * or no rows exist yet, so the UI continues to render.
 */
export async function fetchDieselWeek(): Promise<DieselDay[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("power_logs")
      .select("recorded_at, liters_avoided, diesel_offset_liters, client_id")
      .eq("client_id", ENTERPRISE_CLIENT_ID)
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: true });

    if (error || !data || data.length === 0) return FALLBACK;

    const buckets = new Map<string, { d: string; v: number }>();
    for (let i = 0; i < 7; i++) {
      const dt = new Date(since);
      dt.setDate(since.getDate() + i);
      const key = dt.toISOString().slice(0, 10);
      buckets.set(key, { d: DAY_LABEL[dt.getDay()], v: 0 });
    }
    for (const row of data as Array<Record<string, unknown>>) {
      const ts = row.recorded_at as string | null;
      if (!ts) continue;
      const key = ts.slice(0, 10);
      const v =
        Number(row.liters_avoided ?? row.diesel_offset_liters ?? 0) || 0;
      const bucket = buckets.get(key);
      if (bucket) bucket.v += v;
    }
    const week = Array.from(buckets.values());
    return week.some((b) => b.v > 0) ? week : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
