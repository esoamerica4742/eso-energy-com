import { Fuel, TrendingDown, ArrowUpRight } from "lucide-react";

// Liters of diesel prevented per day (Mon → Sun). Sun = today.
const week = [
  { d: "MON", v: 218 },
  { d: "TUE", v: 246 },
  { d: "WED", v: 271 },
  { d: "THU", v: 252 },
  { d: "FRI", v: 289 },
  { d: "SAT", v: 264 },
  { d: "SUN", v: 300 },
];

const TOTAL = week.reduce((a, b) => a + b.v, 0); // 1,840
const MAX = Math.max(...week.map((w) => w.v));
const AVG = Math.round(TOTAL / week.length);

export function DieselBurden() {
  return (
    <div className="glass-card p-4 md:p-7 flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-[0.32em] text-silver uppercase">
            Diesel Burden Regression
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">
            Liters Prevented · This Week
          </h3>
        </div>
        <span className="hairline rounded-full px-3 py-1 inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-silver">
          <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.74_0.17_165)] ticker-dot" />
          7d Window
        </span>
      </header>

      {/* Hero metric */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p
            className="num text-[44px] md:text-[68px] leading-[0.95] font-semibold tracking-[-0.02em]"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.92 0.14 165) 0%, oklch(0.66 0.16 175) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 24px oklch(0.74 0.17 165 / 0.25))",
            }}
          >
            1,840
          </p>
          <p className="mt-1 text-[11px] tracking-[0.28em] uppercase text-silver">
            Liters · Combustion Avoided
          </p>
        </div>
        <div className="flex flex-col items-end text-right">
          <Fuel className="h-5 w-5 text-[oklch(0.74_0.17_165)] mb-2" />
          <div className="flex items-center gap-1.5 text-[oklch(0.82_0.16_165)] text-sm font-medium">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="num">−18.6%</span>
          </div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-silver mt-0.5">
            vs. prior week
          </p>
        </div>
      </div>

      {/* Micro-bar chart */}
      <div>
        <div className="relative h-24 md:h-28">
          {/* Average reference line */}
          <div
            className="absolute left-0 right-0 md:right-10 border-t border-dashed"
            style={{
              top: `${100 - (AVG / MAX) * 100}%`,
              borderColor: "oklch(0.74 0.17 165 / 0.35)",
            }}
          >
            <span
              className="absolute -top-3.5 right-0 md:-top-2 md:right-[-44px] text-[9px] tracking-[0.18em] uppercase font-mono text-[oklch(0.82_0.16_165)]"
            >
              avg {AVG}L
            </span>
          </div>

          {/* Bars */}
          <div className="absolute inset-0 flex items-end gap-1 md:gap-2 pr-0 md:pr-12">
            {week.map((b, i) => {
              const isToday = i === week.length - 1;
              const h = (b.v / MAX) * 100;
              return (
                <div key={b.d} className="flex-1 h-full flex items-end relative group">
                  <span
                    className="absolute left-1/2 -translate-x-1/2 text-[9.5px] font-mono tabular-nums opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      bottom: `calc(${h}% + 6px)`,
                      color: isToday ? "oklch(0.92 0.14 165)" : "oklch(0.82 0.02 265)",
                    }}
                  >
                    {b.v}L
                  </span>
                  <div
                    className="w-full rounded-[2px] transition-all duration-500 ease-out"
                    style={{
                      height: `${h}%`,
                      background: isToday
                        ? "linear-gradient(180deg, oklch(0.88 0.16 165) 0%, oklch(0.56 0.14 175) 100%)"
                        : "linear-gradient(180deg, oklch(0.55 0.06 220 / 0.55) 0%, oklch(0.32 0.04 240 / 0.25) 100%)",
                      boxShadow: isToday
                        ? "0 0 16px oklch(0.74 0.17 165 / 0.55), inset 0 1px 0 oklch(0.95 0.10 165 / 0.6)"
                        : "inset 0 1px 0 oklch(0.7 0.04 220 / 0.18)",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Day axis */}
        <div className="mt-2 flex items-end gap-1 md:gap-2 pr-0 md:pr-12">
          {week.map((b, i) => {
            const isToday = i === week.length - 1;
            return (
              <div
                key={b.d}
                className={`flex-1 text-center text-[9px] md:text-[9.5px] tracking-[0.12em] md:tracking-[0.22em] font-mono ${
                  isToday ? "text-[oklch(0.88_0.14_165)]" : "text-silver/60"
                }`}
              >
                {b.d}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer ledger */}
      <div className="hairline rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ background: "linear-gradient(160deg, oklch(0.18 0.04 175 / 0.18), oklch(0.12 0.02 265 / 0.5))" }}>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] tracking-[0.22em] uppercase text-silver">Monetary Equivalent</span>
          <span className="num text-[15px] font-semibold tracking-tight text-[oklch(0.92_0.05_165)]">
            ₦2,171,200
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-[oklch(0.82_0.16_165)] cursor-pointer hover:text-[oklch(0.92_0.14_165)] transition-colors">
          Audit Ledger
          <ArrowUpRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
