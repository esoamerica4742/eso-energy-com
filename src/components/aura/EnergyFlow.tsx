import { Sun, Cpu, Building2, BatteryCharging } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchLatestPowerLogs } from "@/lib/aura";

const Particle = ({ d, delay, color }: { d: string; delay: string; color: string }) => (
  <circle r="3" fill={color} style={{
    filter: `drop-shadow(0 0 6px ${color})`,
    offsetPath: `path('${d}')`,
    animation: `flow-right 2.6s linear infinite`,
    animationDelay: delay,
  } as React.CSSProperties} />
);

export function EnergyFlow() {
  const q = useQuery({
    queryKey: ["latest-power-logs"],
    queryFn: fetchLatestPowerLogs,
    staleTime: 30_000,
  });

  const sites = q.data ?? [];
  const totals = sites.reduce(
    (acc, { log }) => {
      if (!log) return acc;
      acc.solar += Number(log.solar_generation_kw ?? 0);
      acc.load += Number(log.load_consumption_kw ?? 0);
      acc.batt += Number(log.battery_percentage ?? 0);
      acc.battCount += 1;
      return acc;
    },
    { solar: 0, load: 0, batt: 0, battCount: 0 },
  );
  const avgBatt = totals.battCount > 0 ? Math.round(totals.batt / totals.battCount) : 0;
  const heroSite = sites.find((s) => s.log) ?? sites[0];
  const heroName = heroSite?.facility.facility_name ?? "EsoEnergy Mesh";

  // Path coords (in viewBox 1000x260)
  const pathA = "M 165 130 C 280 130, 360 130, 480 130";
  const pathB = "M 520 130 C 640 130, 720 130, 835 130";

  return (
    <div className="glass-card relative overflow-hidden p-6 md:p-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-silver uppercase">Energy Orchestration Layer</p>
          <h2 className="text-xl md:text-2xl font-semibold mt-1 tracking-tight shimmer-text">Live Power Network — {heroName}</h2>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[11px] text-silver">
          <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.74_0.17_165)] ticker-dot" />
          Streaming · 60 Hz telemetry
        </div>
      </div>

      <div className="relative">
        <svg viewBox="0 0 1000 260" className="w-full h-[240px] md:h-[280px]">
          <defs>
            <linearGradient id="wire" x1="0" x2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.17 75)" stopOpacity="0.6" />
              <stop offset="50%" stopColor="oklch(0.74 0.025 255)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="oklch(0.74 0.13 215)" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Wires */}
          <path d={pathA} fill="none" stroke="url(#wire)" strokeWidth="1.25" />
          <path d={pathB} fill="none" stroke="url(#wire)" strokeWidth="1.25" />

          {/* Particles - Solar -> Inverter (amber) */}
          <Particle d={pathA} delay="0s"   color="#f59e0b" />
          <Particle d={pathA} delay="0.6s" color="#f59e0b" />
          <Particle d={pathA} delay="1.3s" color="#f59e0b" />
          <Particle d={pathA} delay="1.9s" color="#f59e0b" />

          {/* Particles - Inverter -> Facility (cyan / mint) */}
          <Particle d={pathB} delay="0.2s" color="#06b6d4" />
          <Particle d={pathB} delay="0.9s" color="#10b981" />
          <Particle d={pathB} delay="1.5s" color="#06b6d4" />
          <Particle d={pathB} delay="2.1s" color="#10b981" />
        </svg>

        {/* Nodes overlay */}
        <div className="absolute inset-0 grid grid-cols-3 items-center px-2 md:px-6">
          <Node label="Solar Capture Fields" sub={`${totals.solar.toFixed(1)} kW · ${sites.length} site${sites.length === 1 ? "" : "s"}`} icon={<Sun className="h-7 w-7" />} accent="solar" />
          <Node label="EsoEnergy Inverter Intelligence" sub="MPPT · 98.2% η" icon={<Cpu className="h-7 w-7" />} accent="silver" central />
          <Node label="Facility Grid Load" sub={`${totals.load.toFixed(1)} kW draw`} icon={<Building2 className="h-7 w-7" />} accent="storage" />
        </div>
      </div>

      {/* Storage cell */}
      <div className="mt-6 flex items-center justify-center">
        <div className="hairline rounded-2xl bg-[oklch(0.16_0.02_265_/_0.7)] px-5 py-3 flex items-center gap-4 shadow-[0_0_40px_-10px_oklch(0.74_0.13_215_/_0.5)]">
          <BatteryCharging className="h-5 w-5 text-[oklch(0.78_0.13_215)]" />
          <div className="flex items-center gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="relative h-7 w-24 rounded-md hairline overflow-hidden bg-[oklch(0.13_0.02_265)]">
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${avgBatt}%`,
                    background: "linear-gradient(90deg, oklch(0.58 0.14 230), oklch(0.78 0.13 215))",
                    boxShadow: "var(--glow-storage)",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-[0.2em] text-silver uppercase">Lithium Reserve</p>
            <p className="num text-base font-semibold text-[oklch(0.85_0.12_215)]">{avgBatt}% SoC · fleet avg</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Node({
  label, sub, icon, accent, central = false,
}: { label: string; sub: string; icon: React.ReactNode; accent: "solar" | "silver" | "storage"; central?: boolean }) {
  const accentColor =
    accent === "solar" ? "oklch(0.78 0.17 75)"
    : accent === "storage" ? "oklch(0.74 0.13 215)"
    : "oklch(0.86 0.02 255)";
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <div
          className={`pulse-ring h-20 w-20 md:h-24 md:w-24 rounded-full grid place-items-center hairline`}
          style={{
            background: "radial-gradient(circle at 30% 25%, oklch(0.28 0.03 265 / 0.95), oklch(0.14 0.02 265 / 0.95))",
            boxShadow: `0 0 0 1px oklch(0.30 0.03 265) inset, 0 0 36px ${accentColor.replace(")", " / 0.35)")}`,
            color: accentColor,
          }}
        >
          {icon}
          {central && (
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-[oklch(0.74_0.17_165)] ticker-dot" />
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] tracking-[0.18em] uppercase text-silver">{label}</p>
      <p className="num text-sm font-medium text-foreground/90 mt-0.5">{sub}</p>
    </div>
  );
}
