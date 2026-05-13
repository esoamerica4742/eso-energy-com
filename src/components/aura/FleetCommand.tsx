import { Radar, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchLatestPowerLogs, type PowerLog, type Facility } from "@/lib/aura";

type Status = "OPTIMAL" | "DEGRADED" | "STABLE";

const statusColor: Record<Status, { fg: string; glow: string; bg: string }> = {
  OPTIMAL: { fg: "oklch(0.85 0.16 165)", glow: "oklch(0.74 0.17 165 / 0.45)", bg: "oklch(0.30 0.10 165 / 0.18)" },
  DEGRADED: { fg: "oklch(0.85 0.16 75)", glow: "oklch(0.78 0.17 75 / 0.5)", bg: "oklch(0.30 0.10 75 / 0.20)" },
  STABLE: { fg: "oklch(0.85 0.10 215)", glow: "oklch(0.74 0.13 215 / 0.4)", bg: "oklch(0.30 0.08 215 / 0.18)" },
};

function deriveMix(log: PowerLog | null) {
  if (!log) return { solar: 0, battery: 0, grid: 0, diesel: 0 };
  const load = Math.max(1, Number(log.load_consumption_kw ?? 0));
  const solarRaw = Math.max(0, Number(log.solar_generation_kw ?? 0));
  const solar = Math.round(Math.min(100, (solarRaw / load) * 100));
  const remaining = Math.max(0, 100 - solar);
  const grid = (log.grid_status ?? "").toLowerCase();
  if (grid === "online" || grid === "stable") return { solar, battery: 0, grid: remaining, diesel: 0 };
  if (grid === "diesel" || grid === "generator") return { solar, battery: 0, grid: 0, diesel: remaining };
  return { solar, battery: remaining, grid: 0, diesel: 0 };
}

function deriveStatus(facility: Facility, log: PowerLog | null): Status {
  const s = (facility.status ?? "").toLowerCase();
  if (s === "degraded" || s === "offline") return "DEGRADED";
  if (!log) return "STABLE";
  const grid = (log.grid_status ?? "").toLowerCase();
  if (grid === "diesel" || grid === "generator") return "DEGRADED";
  if (Number(log.battery_percentage ?? 100) < 25) return "DEGRADED";
  if (Number(log.solar_generation_kw ?? 0) >= Number(log.load_consumption_kw ?? 0)) return "OPTIMAL";
  return "STABLE";
}

function performanceIndex(log: PowerLog | null): number {
  if (!log) return 0;
  const load = Math.max(1, Number(log.load_consumption_kw ?? 0));
  const solar = Math.max(0, Number(log.solar_generation_kw ?? 0));
  const cover = Math.min(1, solar / load);
  const batt = Math.max(0, Math.min(1, Number(log.battery_percentage ?? 0) / 100));
  return Math.round((cover * 0.7 + batt * 0.3) * 1000) / 10;
}

function MixBar({ mix }: { mix: { solar: number; battery: number; grid: number; diesel: number } }) {
  const segs = [
    { v: mix.solar, c: "oklch(0.78 0.17 75)" },
    { v: mix.battery, c: "oklch(0.74 0.13 215)" },
    { v: mix.grid, c: "oklch(0.65 0.04 255)" },
    { v: mix.diesel, c: "oklch(0.55 0.18 25)" },
  ];
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full hairline">
      {segs.map((s, i) => (
        <div key={i} style={{ width: `${s.v}%`, background: s.c }} />
      ))}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function FleetCommand() {
  const q = useQuery({
    queryKey: ["latest-power-logs"],
    queryFn: fetchLatestPowerLogs,
    staleTime: 30_000,
  });

  const sites = q.data ?? [];

  return (
    <div className="glass-card p-6 md:p-7">
      <header className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-silver uppercase">Fleet Command · Multi-Site Radar</p>
          <h3 className="text-lg font-semibold mt-1 tracking-tight">
            {sites.length === 0 ? "Awaiting fleet roster" : `${sites.length} sovereign node${sites.length === 1 ? "" : "s"} · synchronized`}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-silver">
          <Radar className="h-3.5 w-3.5" />
          {q.isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : "Live · Realtime"}
        </div>
      </header>

      <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-3 text-[10px] tracking-[0.22em] uppercase text-silver/70">
        <div className="col-span-4">Site</div>
        <div className="col-span-4">Power Mix</div>
        <div className="col-span-2">Battery</div>
        <div className="col-span-2 text-right">Performance Index</div>
      </div>

      {q.isLoading && <p className="text-[11px] text-silver/70 py-6 text-center">Loading fleet…</p>}
      {!q.isLoading && sites.length === 0 && (
        <p className="text-[11px] text-silver/70 py-6 text-center">No facilities provisioned for this client yet.</p>
      )}

      <div className="space-y-3">
        {sites.map(({ facility, log }) => {
          const mix = deriveMix(log);
          const st = deriveStatus(facility, log);
          const sc = statusColor[st];
          const pi = performanceIndex(log);
          return (
            <div
              key={facility.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-xl hairline p-4 transition-all hover:bg-[oklch(0.22_0.025_265_/_0.5)]"
              style={{ background: "linear-gradient(160deg, oklch(0.18 0.022 265 / 0.6), oklch(0.14 0.02 265 / 0.6))" }}
            >
              <div className="col-span-4 flex items-center gap-3">
                <span
                  className="h-9 w-9 rounded-lg hairline grid place-items-center text-[10px] font-semibold tracking-wider text-silver"
                  style={{ background: "oklch(0.16 0.02 265)" }}
                >
                  {facility.facility_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-tight">{facility.facility_name}</p>
                  <p className="text-[11px] text-silver">{facility.location_state}</p>
                </div>
              </div>

              <div className="col-span-4">
                <MixBar mix={mix} />
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-silver">
                  <Legend color="oklch(0.78 0.17 75)" label={`Solar ${mix.solar}%`} />
                  {mix.battery > 0 && <Legend color="oklch(0.74 0.13 215)" label={`Battery ${mix.battery}%`} />}
                  {mix.grid > 0 && <Legend color="oklch(0.65 0.04 255)" label={`Grid ${mix.grid}%`} />}
                  {mix.diesel > 0 && <Legend color="oklch(0.55 0.18 25)" label={`Diesel ${mix.diesel}%`} />}
                </div>
              </div>

              <div className="col-span-2">
                <p className="num text-sm font-medium">{log ? `${log.battery_percentage}% · ${Number(log.battery_temperature_c).toFixed(1)}°C` : "—"}</p>
              </div>

              <div className="col-span-2 flex md:justify-end">
                <span
                  className="num inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wider"
                  style={{
                    color: sc.fg,
                    background: sc.bg,
                    boxShadow: `0 0 18px ${sc.glow}, inset 0 0 0 1px ${sc.fg.replace(")", " / 0.35)")}`,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full ticker-dot" style={{ background: sc.fg }} />
                  {pi.toFixed(1)}% {st}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
