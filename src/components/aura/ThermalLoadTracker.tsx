import { useEffect, useState } from "react";
import { Thermometer, Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Props = { siteLabel?: string };

type Point = { hour: string; temp: number; load: number };

function buildSeries(seed: number): Point[] {
  // 24 hours of cell temperature (°C) and total load demand (kW)
  const arr: Point[] = [];
  for (let h = 0; h < 24; h++) {
    const dayCurve = Math.sin(((h - 6) / 24) * Math.PI * 2);
    // Load: low overnight, rises 8-18, dip 13-14, surge 19-22 (overnight cooling stress 22-04)
    let load = 60 + 50 * Math.max(0, dayCurve);
    if (h >= 19 && h <= 22) load += 35; // evening surge
    if (h >= 22 || h <= 4) load += 25; // overnight AC stress
    // Temp lags load by 2h
    const tempBase = 28 + 5 * Math.max(0, Math.sin(((h - 8) / 24) * Math.PI * 2));
    let temp = tempBase + (load - 70) * 0.08;
    // Inject seeded jitter
    const j = ((Math.sin((h + 1) * seed * 0.7) + 1) / 2) * 1.6 - 0.8;
    temp += j;
    load += j * 2;
    arr.push({
      hour: `${h.toString().padStart(2, "0")}:00`,
      temp: Math.round(temp * 10) / 10,
      load: Math.round(load * 10) / 10,
    });
  }
  return arr;
}

function ChartSkeleton() {
  return (
    <div className="h-[280px] rounded-xl hairline relative overflow-hidden" style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
      <div className="absolute inset-0 flex items-end gap-1.5 px-4 pb-4">
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${20 + ((i * 13) % 60)}%`,
              background: "linear-gradient(180deg, oklch(0.30 0.10 165 / 0.35), oklch(0.20 0.05 265 / 0.4))",
              animation: `pulse 1.6s ease-in-out ${i * 60}ms infinite`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 grid place-items-center text-[11px] tracking-[0.32em] uppercase text-silver/70">
        Streaming thermal arrays…
      </div>
    </div>
  );
}

function LuxTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const temp = payload.find((p: any) => p.dataKey === "temp")?.value;
  const load = payload.find((p: any) => p.dataKey === "load")?.value;
  const stress = temp > 38 || load > 130;
  return (
    <div
      className="rounded-xl hairline px-3 py-2.5 text-[11px] backdrop-blur-md"
      style={{ background: "oklch(0.13 0.003 265 / 0.92)", boxShadow: "0 12px 40px oklch(0 0 0 / 0.6)" }}
    >
      <p className="text-[10px] tracking-[0.22em] uppercase text-silver/80">{label} WAT</p>
      <div className="mt-1.5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-silver/70">Cell Temp</p>
          <p className="num font-semibold" style={{ color: temp > 38 ? "oklch(0.85 0.18 28)" : "oklch(0.92 0.12 165)" }}>
            {temp}°C
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-silver/70">Load</p>
          <p className="num font-semibold" style={{ color: load > 130 ? "oklch(0.92 0.14 75)" : "oklch(1 0 0)" }}>
            {load} kW
          </p>
        </div>
      </div>
      {stress && (
        <p className="mt-2 text-[10px] text-[oklch(0.92_0.14_75)]">Overnight cooling load detected — review HVAC schedule.</p>
      )}
    </div>
  );
}

export function ThermalLoadTracker({ siteLabel }: Props) {
  const [data, setData] = useState<Point[] | null>(null);
  useEffect(() => {
    setData(null);
    const t = setTimeout(() => setData(buildSeries(siteLabel ? siteLabel.length + 3 : 7)), 850);
    return () => clearTimeout(t);
  }, [siteLabel]);

  return (
    <section className="glass-card p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] tracking-[0.32em] uppercase text-silver">Battery Lifespan Guard · Thermal & Load</p>
          <h2 className="mt-1 text-xl md:text-2xl font-semibold tracking-tight">
            <span className="shimmer-text">Cell Temperature vs Total Load</span> · 24h trace
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase"
            style={{
              color: "oklch(0.92 0.12 165)",
              background: "oklch(0.30 0.10 165 / 0.18)",
              boxShadow: "inset 0 0 0 1px oklch(0.74 0.17 165 / 0.45), 0 0 18px oklch(0.74 0.17 165 / 0.35)",
            }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Optimal Thresholds Maintained
          </span>
        </div>
      </header>

      <p className="text-[12px] text-silver/80 mb-4 max-w-3xl">
        Thermal & Load Stress Tracker correlates cell temperature with active load demand — instantly detecting if staff
        left heavy cooling units running on overnight battery banks.
      </p>

      {!data ? (
        <ChartSkeleton />
      ) : (
        <div className="h-[280px] rounded-xl hairline p-2" style={{ background: "oklch(0.16 0.015 265 / 0.4)" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="tlt-temp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.17 165)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="oklch(0.78 0.17 165)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tlt-load" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.13 86)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="oklch(0.78 0.13 86)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: "oklch(0.78 0.01 265)", fontSize: 10, letterSpacing: "0.1em" }}
                tickLine={false}
                axisLine={{ stroke: "oklch(1 0 0 / 0.08)" }}
                interval={2}
              />
              <YAxis
                yAxisId="temp"
                orientation="left"
                tick={{ fill: "oklch(0.88 0.16 165)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "oklch(1 0 0 / 0.08)" }}
                width={36}
                unit="°"
              />
              <YAxis
                yAxisId="load"
                orientation="right"
                tick={{ fill: "oklch(0.89 0.07 88)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "oklch(1 0 0 / 0.08)" }}
                width={36}
              />
              <Tooltip content={<LuxTooltip />} cursor={{ stroke: "oklch(1 0 0 / 0.18)", strokeDasharray: "3 3" }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="plainline"
                wrapperStyle={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "oklch(0.78 0.01 265)" }}
              />
              <Area
                yAxisId="temp"
                type="monotone"
                dataKey="temp"
                name="Cell Temp °C"
                stroke="oklch(0.88 0.16 165)"
                strokeWidth={2}
                fill="url(#tlt-temp)"
                isAnimationActive
              />
              <Area
                yAxisId="load"
                type="monotone"
                dataKey="load"
                name="Load kW"
                stroke="oklch(0.89 0.07 88)"
                strokeWidth={2}
                fill="url(#tlt-load)"
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <footer className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat icon={<Thermometer className="h-3 w-3" />} label="Peak cell temp" value="38.4 °C" tone="emerald" />
        <Stat icon={<Activity className="h-3 w-3" />} label="Avg overnight load" value="84 kW" />
        <Stat icon={<AlertCircle className="h-3 w-3" />} label="Stress events (24h)" value={siteLabel ? "1" : "2"} tone="amber" />
      </footer>
    </section>
  );
}

function Stat({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: string; tone?: "emerald" | "amber" }) {
  const color = tone === "emerald" ? "oklch(0.92 0.12 165)" : tone === "amber" ? "oklch(0.92 0.14 75)" : "oklch(1 0 0)";
  return (
    <div className="rounded-xl hairline px-3 py-2.5" style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
      <p className="text-[9px] tracking-[0.22em] uppercase text-silver/70 flex items-center gap-1">{icon}{label}</p>
      <p className="num text-[15px] font-semibold mt-1" style={{ color }}>{value}</p>
    </div>
  );
}
