import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ClipboardCheck, Wrench, Zap } from "lucide-react";
import { useSim } from "@/lib/sim-store";

type Point = { hour: string; h: number; expected: number; actual: number };

// Bell curve helper: peak at 13:00, sigma 3.2h
function bell(h: number, peak = 13, sigma = 3.2, max = 320) {
  return Math.max(0, max * Math.exp(-((h - peak) ** 2) / (2 * sigma * sigma)));
}

const ANOMALY_START = 12;
const ANOMALY_END = 14;

function buildSeries(wiringFault = false): Point[] {
  const out: Point[] = [];
  const dipMultiplier = wiringFault ? 0.55 : 0.6; // -45% vs -40%
  for (let h = 0; h < 24; h++) {
    const expected = Math.round(bell(h));
    let actual = expected;
    if (h >= ANOMALY_START && h <= ANOMALY_END) {
      actual = Math.round(expected * dipMultiplier);
    } else if (h >= 6 && h <= 18) {
      const wobble = (Math.sin(h * 1.7) + Math.cos(h * 0.9)) * 6;
      actual = Math.max(0, Math.round(expected + wobble));
    }
    out.push({
      hour: `${String(h).padStart(2, "0")}:00`,
      h,
      expected,
      actual,
    });
  }
  return out;
}

function ChartSkeleton() {
  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl hairline"
      style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
      <div className="absolute inset-0 flex items-end gap-1 px-4 pb-6 pt-10">
        {Array.from({ length: 24 }).map((_, i) => {
          const h = 20 + Math.abs(Math.sin(i * 0.8)) * 70;
          return (
            <div
              key={i}
              className="shimmer-block flex-1 rounded-md"
              style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
            />
          );
        })}
      </div>
      <div className="absolute top-3 left-4 right-4 flex justify-between">
        <div className="h-3 w-32 rounded-full shimmer-block" />
        <div className="h-3 w-20 rounded-full shimmer-block" />
      </div>
    </div>
  );
}

function LuxuryTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const expected = payload.find((p: any) => p.dataKey === "expected")?.value ?? 0;
  const actual = payload.find((p: any) => p.dataKey === "actual")?.value ?? 0;
  const hour = Number((label as string).split(":")[0]);
  const isAnomaly = hour >= ANOMALY_START && hour <= ANOMALY_END;
  const delta = expected > 0 ? Math.round(((actual - expected) / expected) * 100) : 0;

  return (
    <div
      className="rounded-xl p-3.5 backdrop-blur-xl"
      style={{
        minWidth: 240,
        background: "linear-gradient(160deg, oklch(0.18 0.02 265 / 0.92), oklch(0.13 0.015 265 / 0.92))",
        boxShadow: isAnomaly
          ? "inset 0 0 0 1px oklch(0.66 0.20 25 / 0.45), 0 0 50px oklch(0.66 0.22 25 / 0.25), 0 12px 40px oklch(0 0 0 / 0.6)"
          : "inset 0 0 0 1px oklch(1 0 0 / 0.08), 0 12px 40px oklch(0 0 0 / 0.6)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] tracking-[0.22em] uppercase text-silver/80">{label} WAT</p>
        {isAnomaly && (
          <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase font-semibold"
            style={{ color: "oklch(0.92 0.16 25)" }}>
            <AlertTriangle className="h-3 w-3" /> Anomaly
          </span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md hairline px-2 py-1.5" style={{ background: "oklch(0.16 0.015 265 / 0.6)" }}>
          <p className="tracking-[0.18em] uppercase text-silver/70 text-[9px]">Expected</p>
          <p className="num text-sm font-semibold mt-0.5" style={{ color: "oklch(0.86 0.02 255)" }}>
            {expected} <span className="text-[10px] text-silver/70">kW</span>
          </p>
        </div>
        <div className="rounded-md hairline px-2 py-1.5" style={{ background: "oklch(0.16 0.015 265 / 0.6)" }}>
          <p className="tracking-[0.18em] uppercase text-silver/70 text-[9px]">Actual</p>
          <p
            className="num text-sm font-semibold mt-0.5"
            style={{ color: isAnomaly ? "oklch(0.92 0.16 25)" : "oklch(0.88 0.16 165)" }}
          >
            {actual} <span className="text-[10px] text-silver/70">kW</span>
          </p>
        </div>
      </div>
      <p className="mt-2 text-[10px] tracking-[0.18em] uppercase text-silver/80">
        Δ vs baseline:{" "}
        <span className="num font-semibold" style={{ color: delta < -5 ? "oklch(0.92 0.16 25)" : "oklch(0.86 0.02 255)" }}>
          {delta > 0 ? "+" : ""}
          {delta}%
        </span>
      </p>

      {isAnomaly && (
        <div
          className="mt-3 rounded-lg p-2.5 text-[11px] leading-relaxed"
          style={{
            background: "linear-gradient(160deg, oklch(0.24 0.06 25 / 0.55), oklch(0.16 0.02 265 / 0.7))",
            boxShadow: "inset 0 0 0 1px oklch(0.66 0.20 25 / 0.45)",
            color: "oklch(0.95 0.04 25)",
          }}
        >
          <p className="text-[9px] tracking-[0.22em] uppercase mb-1 font-semibold" style={{ color: "oklch(0.92 0.16 25)" }}>
            Diagnostic
          </p>
          <p className="font-light">
            <span className="font-semibold">Structural shading or faulty string wiring detected.</span>{" "}
            Output drops 40% below baseline. Contact installer for rectification.
          </p>
        </div>
      )}
    </div>
  );
}

export function ContractorAuditTool() {
  const sim = useSim();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 900);
    return () => clearTimeout(t);
  }, []);

  const data = loaded ? buildSeries(sim.wiring) : null;

  const totalExpected = data?.reduce((a, p) => a + p.expected, 0) ?? 0;
  const totalActual = data?.reduce((a, p) => a + p.actual, 0) ?? 0;
  const yieldPct = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;
  const lossKwh = Math.max(0, totalExpected - totalActual);

  return (
    <section className="glass-card p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <p className="text-[11px] tracking-[0.32em] uppercase text-silver">Contractor Audit Tool</p>
            <h2 className="mt-1 text-2xl md:text-[28px] font-semibold tracking-tight">
              <span className="shimmer-text">24-hour generation curve</span> · expected vs actual
            </h2>
          </div>
          {sim.wiring && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase sim-flash"
              style={{
                color: "oklch(0.95 0.16 75)",
                background: "oklch(0.30 0.14 75 / 0.18)",
              }}
              title="Anomaly Flagged: Potential structural shading or loose string wiring detected."
            >
              <Zap className="h-3 w-3" /> Wiring Anomaly Active
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Legend swatch="oklch(0.86 0.02 255)" label="Expected Output" dashed />
          <Legend swatch="oklch(0.78 0.17 165)" label="Actual Solar Generation" />
          <Legend swatch="oklch(0.78 0.17 25)"  label="Anomaly Window" />
        </div>
      </header>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi label="Daily Yield" value={data ? `${yieldPct}%` : null} accent={yieldPct >= 95 ? "oklch(0.88 0.16 165)" : "oklch(0.92 0.16 75)"} />
        <Kpi label="Expected" value={data ? `${totalExpected.toLocaleString()} kWh` : null} />
        <Kpi label="Actual" value={data ? `${totalActual.toLocaleString()} kWh` : null} />
        <Kpi label="Loss" value={data ? `${lossKwh.toLocaleString()} kWh` : null} accent="oklch(0.92 0.16 25)" />
      </div>

      {/* Chart or skeleton */}
      {!data ? (
        <ChartSkeleton />
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.86 0.16 165)" stopOpacity={0.55} />
                  <stop offset="55%" stopColor="oklch(0.78 0.17 165)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="oklch(0.78 0.17 165)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expectedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.86 0.02 255)" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="oklch(0.86 0.02 255)" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="oklch(0.74 0.025 255 / 0.5)"
                tick={{ fontSize: 10, fill: "oklch(0.74 0.025 255)" }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                stroke="oklch(0.74 0.025 255 / 0.5)"
                tick={{ fontSize: 10, fill: "oklch(0.74 0.025 255)" }}
                tickLine={false}
                axisLine={false}
                width={40}
                unit=" kW"
              />

              {/* Anomaly window shading */}
              <ReferenceArea
                x1={`${String(ANOMALY_START).padStart(2, "0")}:00`}
                x2={`${String(ANOMALY_END).padStart(2, "0")}:00`}
                strokeOpacity={0}
                fill="oklch(0.66 0.20 25)"
                fillOpacity={0.12}
              />

              <Tooltip
                content={<LuxuryTooltip />}
                cursor={{ stroke: "oklch(1 0 0 / 0.18)", strokeDasharray: "3 3" }}
              />

              <Area
                type="monotone"
                dataKey="expected"
                stroke="oklch(0.86 0.02 255)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="url(#expectedFill)"
                isAnimationActive
                animationDuration={900}
                dot={false}
                activeDot={{ r: 3, fill: "oklch(0.86 0.02 255)", stroke: "oklch(0.13 0.003 265)", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="oklch(0.78 0.17 165)"
                strokeWidth={2}
                fill="url(#actualFill)"
                isAnimationActive
                animationDuration={1100}
                dot={false}
                activeDot={{ r: 4, fill: "oklch(0.88 0.16 165)", stroke: "oklch(0.13 0.003 265)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer / inline anomaly summary */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-silver">
          <ClipboardCheck className="h-3.5 w-3.5" />
          <span className="tracking-[0.18em] uppercase">
            1 anomaly flagged · 12:00–14:00 · 40% below baseline
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-all hover:-translate-y-0.5"
          style={{
            color: "oklch(0.13 0.003 265)",
            background: "linear-gradient(135deg, oklch(0.78 0.13 86), oklch(0.89 0.07 88))",
            boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.4), 0 8px 24px oklch(0.78 0.13 86 / 0.35)",
          }}
        >
          <Wrench className="h-3.5 w-3.5" /> Dispatch Installer
        </button>
      </div>
    </section>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | null; accent?: string }) {
  return (
    <div className="rounded-xl hairline px-3 py-3" style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
      <p className="text-[9px] tracking-[0.22em] uppercase text-silver/70">{label}</p>
      {value === null ? (
        <div className="mt-2 h-4 w-20 shimmer-block rounded-full" />
      ) : (
        <p className="num text-base font-semibold mt-1" style={{ color: accent }}>{value}</p>
      )}
    </div>
  );
}

function Legend({ swatch, label, dashed = false }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full hairline px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase text-silver"
      style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
      <span
        className="inline-block h-0.5 w-4"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${swatch} 0 4px, transparent 4px 8px)`
            : swatch,
          boxShadow: `0 0 8px ${swatch}`,
        }}
      />
      {label}
    </span>
  );
}
