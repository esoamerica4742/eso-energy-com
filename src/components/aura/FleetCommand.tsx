import { Radar } from "lucide-react";

type Site = {
  name: string;
  region: string;
  mix: { solar: number; battery: number; grid: number; diesel: number };
  diesel: string;
  pi: number;
  status: "OPTIMAL" | "DEGRADED" | "STABLE";
};

const sites: Site[] = [
  { name: "Ikeja Regional HQ", region: "Lagos · Tier 1", mix: { solar: 62, battery: 24, grid: 14, diesel: 0 }, diesel: "0h 00m · 7-day", pi: 98.4, status: "OPTIMAL" },
  { name: "Lekki Premium Terminal", region: "Lagos · Tier 1", mix: { solar: 41, battery: 18, grid: 22, diesel: 19 }, diesel: "4h 12m · 7-day", pi: 74.1, status: "DEGRADED" },
  { name: "Abuja Operations Annex", region: "FCT · Tier 2", mix: { solar: 55, battery: 28, grid: 17, diesel: 0 }, diesel: "0h 36m · 7-day", pi: 91.7, status: "STABLE" },
];

const statusColor = {
  OPTIMAL: { fg: "oklch(0.85 0.16 165)", glow: "oklch(0.74 0.17 165 / 0.45)", bg: "oklch(0.30 0.10 165 / 0.18)" },
  DEGRADED: { fg: "oklch(0.85 0.16 75)", glow: "oklch(0.78 0.17 75 / 0.5)", bg: "oklch(0.30 0.10 75 / 0.20)" },
  STABLE: { fg: "oklch(0.85 0.10 215)", glow: "oklch(0.74 0.13 215 / 0.4)", bg: "oklch(0.30 0.08 215 / 0.18)" },
};

function MixBar({ mix }: { mix: Site["mix"] }) {
  const segs = [
    { v: mix.solar,   c: "oklch(0.78 0.17 75)" },
    { v: mix.battery, c: "oklch(0.74 0.13 215)" },
    { v: mix.grid,    c: "oklch(0.65 0.04 255)" },
    { v: mix.diesel,  c: "oklch(0.55 0.18 25)" },
  ];
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full hairline">
      {segs.map((s, i) => (
        <div key={i} style={{ width: `${s.v}%`, background: s.c }} />
      ))}
    </div>
  );
}

export function FleetCommand() {
  return (
    <div className="glass-card p-6 md:p-7">
      <header className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-silver uppercase">Fleet Command · Multi-Site Radar</p>
          <h3 className="text-lg font-semibold mt-1 tracking-tight">3 sovereign nodes · synchronized</h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-silver">
          <Radar className="h-3.5 w-3.5" />
          Sweep · 4.2s
        </div>
      </header>

      <div className="hidden md:grid grid-cols-12 gap-4 px-2 pb-3 text-[10px] tracking-[0.22em] uppercase text-silver/70">
        <div className="col-span-4">Site</div>
        <div className="col-span-4">Power Mix</div>
        <div className="col-span-2">Diesel Runtime</div>
        <div className="col-span-2 text-right">Performance Index</div>
      </div>

      <div className="space-y-3">
        {sites.map((s) => {
          const sc = statusColor[s.status];
          return (
            <div key={s.name}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-xl hairline p-4 transition-all hover:bg-[oklch(0.22_0.025_265_/_0.5)]"
              style={{ background: "linear-gradient(160deg, oklch(0.18 0.022 265 / 0.6), oklch(0.14 0.02 265 / 0.6))" }}
            >
              <div className="col-span-4 flex items-center gap-3">
                <span className="h-9 w-9 rounded-lg hairline grid place-items-center text-[10px] font-semibold tracking-wider text-silver"
                  style={{ background: "oklch(0.16 0.02 265)" }}>
                  {s.name.split(" ").map(w => w[0]).slice(0,2).join("")}
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-tight">{s.name}</p>
                  <p className="text-[11px] text-silver">{s.region}</p>
                </div>
              </div>

              <div className="col-span-4">
                <MixBar mix={s.mix} />
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-silver">
                  <Legend color="oklch(0.78 0.17 75)" label={`Solar ${s.mix.solar}%`} />
                  <Legend color="oklch(0.74 0.13 215)" label={`Battery ${s.mix.battery}%`} />
                  <Legend color="oklch(0.65 0.04 255)" label={`Grid ${s.mix.grid}%`} />
                  {s.mix.diesel > 0 && <Legend color="oklch(0.55 0.18 25)" label={`Diesel ${s.mix.diesel}%`} />}
                </div>
              </div>

              <div className="col-span-2">
                <p className="num text-sm font-medium">{s.diesel}</p>
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
                  {s.pi.toFixed(1)}% {s.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
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
