import { useEffect, useState } from "react";
import { Banknote, HeartPulse, TrendingUp, Activity, Sun, Fuel } from "lucide-react";
import { SavingsSparkline } from "@/components/aura/SavingsSparkline";
import { Link } from "@tanstack/react-router";

type Props = {
  siteLabel?: string;
};

const formatNaira = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

function CountUp({ value, duration = 1200, format }: { value: number; duration?: number; format: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(n)}</>;
}

function HealthMeter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      <div
        className="relative h-2 rounded-full overflow-hidden"
        style={{ background: "oklch(1 0 0 / 0.06)", boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.06)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, oklch(0.78 0.17 165), oklch(0.88 0.16 165), oklch(0.78 0.13 86))",
            boxShadow: "0 0 18px oklch(0.74 0.17 165 / 0.55)",
            transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        {/* tick marks */}
        <div className="absolute inset-0 flex justify-between px-1 items-center pointer-events-none">
          {[...Array(11)].map((_, i) => (
            <span key={i} className="h-1 w-px" style={{ background: "oklch(1 0 0 / 0.18)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExecutiveRibbons({ siteLabel }: Props) {
  // Mock aggregates — reseed when site filter changes
  const isSite = !!siteLabel;
  const dailySavings = isSite ? 412_750 : 1_864_300;
  const monthSavings = isSite ? 11_240_000 : 52_310_000;
  const fleetHealth = isSite ? 94 : 96.4;
  const stability = isSite ? 99.62 : 99.91;
  const solarShare = isSite ? 71 : 64;
  const dieselAvoided = isSite ? 318 : 1_472; // litres

  return (
    <section
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      key={siteLabel || "all"}
    >
      {/* Net Daily Savings */}
      <article className="glass-card p-6 md:p-7 lg:col-span-7 relative overflow-hidden">
        <div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(closest-side, oklch(0.78 0.13 86 / 0.18), transparent 70%)" }}
          aria-hidden
        />
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.32em] uppercase text-silver/80">Net Daily Savings · Solar vs Diesel</p>
            <h3 className="mt-1 text-[13px] text-silver/70 font-normal">
              Aggregate fuel + grid offset across {isSite ? "selected branch" : "all active sites"} · 24h rolling
            </h3>
          </div>
          <span
            className="h-9 w-9 rounded-xl hairline grid place-items-center"
            style={{ background: "oklch(0.30 0.10 86 / 0.18)", color: "oklch(0.92 0.12 86)", boxShadow: "0 0 22px oklch(0.78 0.13 86 / 0.35)" }}
          >
            <Banknote className="h-4 w-4" />
          </span>
        </header>

        <div className="mt-5 flex items-end gap-3 flex-wrap">
          <p className="num font-semibold tracking-tight text-4xl md:text-5xl shimmer-text">
            <CountUp value={dailySavings} format={formatNaira} />
          </p>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] uppercase mb-2"
            style={{ color: "oklch(0.88 0.16 165)", background: "oklch(0.30 0.10 165 / 0.18)", boxShadow: "inset 0 0 0 1px oklch(0.74 0.17 165 / 0.45)" }}
          >
            <TrendingUp className="h-3 w-3" /> +12.4% vs 7-day avg
          </span>
        </div>

        <SavingsSparkline />
        <p className="text-[11px] text-silver/50 mt-2">7-day trend · diesel offset vs prior week</p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Mini label="Month-to-date" value={formatNaira(monthSavings)} />
          <Mini label="Diesel avoided" value={`${dieselAvoided.toLocaleString()} L`} icon={<Fuel className="h-3 w-3" />} tone="amber" />
          <Mini label="Solar share" value={`${solarShare}%`} icon={<Sun className="h-3 w-3" />} tone="emerald" />
        </div>
      </article>

      {/* Fleet Aggregated Health */}
      <article className="glass-card p-6 md:p-7 lg:col-span-5 relative overflow-hidden">
        <div
          className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(closest-side, oklch(0.74 0.17 165 / 0.18), transparent 70%)" }}
          aria-hidden
        />
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.32em] uppercase text-silver/80">Fleet Aggregated Health</p>
            <h3 className="mt-1 text-[13px] text-silver/70 font-normal">
              Real-time battery & operational stability index
            </h3>
          </div>
          <span
            className="h-9 w-9 rounded-xl hairline grid place-items-center"
            style={{ background: "oklch(0.30 0.10 165 / 0.18)", color: "oklch(0.92 0.12 165)", boxShadow: "0 0 22px oklch(0.74 0.17 165 / 0.45)" }}
          >
            <HeartPulse className="h-4 w-4" />
          </span>
        </header>

        <div className="mt-5 flex items-end gap-3">
          <p className="num font-semibold tracking-tight text-4xl md:text-5xl" style={{ color: "oklch(0.92 0.12 165)" }}>
            <CountUp value={fleetHealth} duration={1100} format={(n) => n.toFixed(1)} />
            <span className="text-2xl text-silver/70 align-top ml-1">%</span>
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] text-silver mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.74_0.17_165)] ticker-dot" />
            Nominal
          </span>
        </div>

        <div className="mt-4">
          <HealthMeter value={fleetHealth} />
          <div className="mt-2 flex items-center justify-between text-[10px] text-silver/70 tracking-[0.22em] uppercase">
            <span>0</span><span>50</span><span>100</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Mini label="Stability" value={`${stability}%`} icon={<Activity className="h-3 w-3" />} />
          <Link to="/alerts" className="block rounded-xl hairline px-3 py-2.5 hover:bg-white/[0.03] transition-colors" style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
            <p className="text-[9px] tracking-[0.22em] uppercase text-silver/70">Active alerts</p>
            <p className="num text-[15px] font-semibold mt-1" style={{ color: "oklch(0.92 0.12 75)" }}>{isSite ? "1" : "3"}</p>
          </Link>
        </div>
      </article>
    </section>
  );
}

function Mini({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "emerald" | "amber";
}) {
  const color =
    tone === "emerald"
      ? "oklch(0.92 0.12 165)"
      : tone === "amber"
      ? "oklch(0.92 0.12 75)"
      : "oklch(1 0 0)";
  return (
    <div className="rounded-xl hairline px-3 py-2.5" style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
      <p className="text-[9px] tracking-[0.22em] uppercase text-silver/70 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="num text-[15px] font-semibold mt-1" style={{ color }}>{value}</p>
    </div>
  );
}
