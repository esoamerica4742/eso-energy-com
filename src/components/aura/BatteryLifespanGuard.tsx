import { useState } from "react";
import { ShieldCheck, Thermometer, AlertTriangle, Check, Activity, Siren } from "lucide-react";
import { useSim } from "@/lib/sim-store";

const HEALTH_NORMAL = 94;
const HEALTH_STRESSED = 71;
const YEARS_REMAINING = 8;

function HealthRing({ value, stressed }: { value: number; stressed: boolean }) {
  const size = 220;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  const ringHue = stressed ? "oklch(0.78 0.18 25)" : "oklch(0.74 0.17 165)";
  const ringHueLight = stressed ? "oklch(0.92 0.16 25)" : "oklch(0.88 0.16 165)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: stressed
            ? "0 0 80px oklch(0.78 0.18 25 / 0.40), inset 0 0 40px oklch(0.78 0.18 25 / 0.18)"
            : "0 0 80px oklch(0.74 0.17 165 / 0.35), inset 0 0 40px oklch(0.74 0.17 165 / 0.15)",
          transition: "box-shadow 600ms ease",
        }}
        aria-hidden
      />
      <svg width={size} height={size} className="relative -rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stressed ? "oklch(0.92 0.16 25)" : "oklch(0.88 0.16 165)"} />
            <stop offset="55%" stopColor={ringHue} />
            <stop offset="100%" stopColor="oklch(0.78 0.13 86)" />
          </linearGradient>
        </defs>
        {/* Outer hairline track */}
        <circle cx={size / 2} cy={size / 2} r={r + 6} fill="none" stroke="oklch(1 0 0 / 0.04)" strokeWidth={1} />
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(1 0 0 / 0.05)" strokeWidth={stroke} />
        {/* Inner hairline track */}
        <circle cx={size / 2} cy={size / 2} r={r - 14} fill="none" stroke="oklch(1 0 0 / 0.035)" strokeWidth={1} />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{
            filter: `drop-shadow(0 0 12px ${ringHue.replace(")", " / 0.7)")})`,
            transition: "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1), stroke 600ms ease",
          }}
        />
        {/* Sweeping pulse arc */}
        <g className="gauge-sweep">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ringHueLight}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.06} ${c}`}
            style={{ filter: `drop-shadow(0 0 8px ${ringHueLight})`, opacity: 0.85 }}
          />
        </g>
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[9px] tracking-[0.32em] uppercase text-silver/80">Cell Health</p>
        <p
          className="num text-5xl font-semibold mt-1 tracking-tight tabular-nums"
          style={{ color: ringHueLight, transition: "color 600ms ease" }}
        >
          {value}
          <span className="text-2xl text-silver/70 align-top">%</span>
        </p>
        <span
          className="mt-2 inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase"
          style={{ color: ringHueLight, transition: "color 600ms ease" }}
        >
          {stressed ? (
            <>
              <AlertTriangle className="h-3 w-3" /> High Thermal Stress
            </>
          ) : (
            <>
              <ShieldCheck className="h-3 w-3" /> Optimal
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg hairline px-3 py-2.5" style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
      <p className="text-[9px] tracking-[0.22em] uppercase text-silver/70">{label}</p>
      <p className="num text-sm font-semibold mt-1" style={{ color: accent ?? undefined }}>{value}</p>
    </div>
  );
}

export function BatteryLifespanGuard() {
  const [acknowledged, setAcknowledged] = useState(false);
  const sim = useSim();
  const stressed = sim.thermal;
  const HEALTH = stressed ? HEALTH_STRESSED : HEALTH_NORMAL;

  return (
    <section className="glass-card relative overflow-hidden p-6 md:p-8">
      {/* Pitch sim push notification */}
      {stressed && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl p-3.5 sim-flash"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.30 0.14 25 / 0.40), oklch(0.18 0.04 265 / 0.7))",
            boxShadow:
              "inset 0 0 0 1px oklch(0.78 0.18 25 / 0.55), 0 0 36px oklch(0.78 0.18 25 / 0.30)",
          }}
        >
          <span
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: "oklch(0.30 0.14 25 / 0.45)",
              color: "oklch(0.95 0.14 25)",
              boxShadow: "inset 0 0 0 1px oklch(0.78 0.18 25 / 0.6)",
            }}
          >
            <Siren className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.28em] uppercase font-semibold" style={{ color: "oklch(0.95 0.14 25)" }}>
              Critical · Push Notification
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground/95">
              <span className="font-semibold">CRITICAL:</span> Heavy AC load detected on Battery
              Bank B. Overheating imminent.
            </p>
          </div>
        </div>
      )}
      <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-[11px] tracking-[0.32em] uppercase text-silver">Battery Lifespan Guard</p>
          <h2 className="mt-1 text-2xl md:text-[28px] font-semibold tracking-tight">
            <span className="shimmer-text">Cell integrity</span> · projected longevity
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-silver">
          <Activity className="h-3 w-3" /> Continuous diagnostics
        </span>
      </header>

      {/* Hero ring + stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-5 flex justify-center">
          <HealthRing value={HEALTH} stressed={stressed} />
        </div>
        <div className="md:col-span-7 space-y-4">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-silver/80">Estimated Lifespan</p>
            <p className="mt-1 text-3xl md:text-4xl font-semibold tracking-tight">
              <span className="num">{YEARS_REMAINING}</span>{" "}
              <span className="text-silver/80 font-light">Years Remaining</span>
            </p>
            <p className="mt-2 text-[12px] text-silver max-w-md leading-relaxed">
              Forecast derived from cycle depth, thermal envelope, and impedance drift across all banks.
              Replacement window opens Q3 · 2034.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Cycles"  value="412 / 6,000" />
            <Stat label="Impedance" value="3.2 mΩ" accent="oklch(0.88 0.16 165)" />
            <Stat label="Avg Temp" value="28.4 °C" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="my-7 h-px w-full" style={{ background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.08), transparent)" }} />

      {/* Thermal & Load Stress Alert */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] tracking-[0.32em] uppercase text-silver">Thermal &amp; Load Stress Alert</p>
          <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase" style={{ color: "oklch(0.88 0.18 25)" }}>
            <Thermometer className="h-3 w-3" /> High Priority
          </span>
        </div>

        <article
          className="relative overflow-hidden rounded-2xl p-5 md:p-6 transition-all"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.22 0.06 25 / 0.35), oklch(0.16 0.03 265 / 0.6))",
            boxShadow:
              "inset 0 0 0 1px oklch(0.66 0.20 25 / 0.35), 0 0 60px oklch(0.66 0.20 25 / 0.18), 0 8px 40px oklch(0 0 0 / 0.5)",
          }}
        >
          {/* Soft red ambient halo */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, oklch(0.66 0.22 25 / 0.35), transparent 70%)" }}
          />

          <div className="relative flex items-start gap-4">
            <span
              className="shrink-0 h-11 w-11 rounded-xl grid place-items-center"
              style={{
                background: "oklch(0.30 0.10 25 / 0.4)",
                color: "oklch(0.92 0.16 25)",
                boxShadow: "inset 0 0 0 1px oklch(0.66 0.20 25 / 0.5), 0 0 24px oklch(0.66 0.22 25 / 0.45)",
              }}
            >
              <AlertTriangle className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-[0.22em] uppercase"
                  style={{
                    color: "oklch(0.95 0.14 25)",
                    background: "oklch(0.30 0.12 25 / 0.45)",
                    boxShadow: "inset 0 0 0 1px oklch(0.66 0.22 25 / 0.55)",
                  }}
                >
                  Warning
                </span>
                <span className="text-[10px] tracking-[0.22em] uppercase text-silver/80">
                  Battery Bank B · Now · 02:14 WAT
                </span>
              </div>

              <p className="mt-3 text-[15px] md:text-base leading-relaxed text-foreground/95 max-w-2xl font-light">
                <span className="font-semibold" style={{ color: "oklch(0.95 0.14 25)" }}>WARNING:</span>{" "}
                High thermal stress detected on Battery Bank B. Overnight AC load is exceeding safety
                parameters. Turn off heavy appliances now to prevent lifespan degradation.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAcknowledged(true)}
                  disabled={acknowledged}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.14em] uppercase transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-default"
                  style={
                    acknowledged
                      ? {
                          color: "oklch(0.92 0.14 165)",
                          background: "oklch(0.30 0.10 165 / 0.3)",
                          boxShadow: "inset 0 0 0 1px oklch(0.74 0.17 165 / 0.5)",
                        }
                      : {
                          color: "oklch(0.13 0.003 265)",
                          background: "linear-gradient(135deg, oklch(0.92 0.14 25), oklch(0.78 0.18 25))",
                          boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.4), 0 8px 24px oklch(0.66 0.22 25 / 0.4)",
                        }
                  }
                >
                  {acknowledged ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Alert Acknowledged
                    </>
                  ) : (
                    <>Acknowledge Alert</>
                  )}
                </button>
                <span className="text-[10px] tracking-[0.18em] uppercase text-silver/70">
                  Bank B · 41.6 °C · Δ +6.2 °C / 30 min
                </span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
