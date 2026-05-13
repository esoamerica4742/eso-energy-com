import type { DieselDay } from "@/components/aura/DieselBurden";

const SAMPLE: DieselDay[] = [
  { d: "MON", v: 218 },
  { d: "TUE", v: 246 },
  { d: "WED", v: 271 },
  { d: "THU", v: 252 },
  { d: "FRI", v: 289 },
  { d: "SAT", v: 264 },
  { d: "SUN", v: 300 },
];

let attempt = 0;

/**
 * Mock telemetry fetcher.
 * Simulates network latency and an intermittent empty response so the
 * skeleton + empty state + retry flow can be exercised end-to-end.
 */
export async function fetchDieselWeek(): Promise<DieselDay[]> {
  await new Promise((r) => setTimeout(r, 1100));
  attempt += 1;
  // First call returns empty so the empty state renders; retries succeed.
  if (attempt === 1) return [];
  // Slight per-call jitter so retries feel "live".
  return SAMPLE.map((day) => ({
    ...day,
    v: Math.max(180, Math.round(day.v + (Math.random() - 0.5) * 30)),
  }));
}
