/**
 * Hero KPI strip — executive glance metrics for B2B solar ops.
 */
import { Sun, Battery, Fuel, TrendingUp } from "lucide-react";

const STATS = [
  {
    label: "Solar Output",
    value: "2.41",
    unit: "MW",
    delta: "+8.2%",
    icon: Sun,
    accent: "text-[#D4AF37]",
  },
  {
    label: "Battery Reserve",
    value: "78",
    unit: "%",
    delta: "Stable",
    icon: Battery,
    accent: "text-emerald-400",
  },
  {
    label: "Diesel Avoided",
    value: "1,472",
    unit: "L today",
    delta: "₦4.2M saved",
    icon: Fuel,
    accent: "text-zinc-300",
  },
  {
    label: "Fleet Uptime",
    value: "99.9",
    unit: "%",
    delta: "12 sites",
    icon: TrendingUp,
    accent: "text-[#00F0FF]",
  },
] as const;

export function DashboardQuickStats() {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {STATS.map((s) => {
        const Icon = s.icon;
        return (
          <article
            key={s.label}
            className="group rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-4 sm:p-5 transition-all duration-300 hover:border-[#D4AF37]/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                {s.label}
              </span>
              <Icon className={`h-4 w-4 ${s.accent} opacity-80`} />
            </div>
            <p className="text-2xl sm:text-[1.65rem] font-semibold text-white tracking-tight tabular-nums">
              {s.value}
              <span className="text-sm font-normal text-zinc-500 ml-1">{s.unit}</span>
            </p>
            <p className="text-[11px] font-mono text-[#D4AF37]/90 mt-2">{s.delta}</p>
          </article>
        );
      })}
    </section>
  );
}
