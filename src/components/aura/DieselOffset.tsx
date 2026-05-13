import { ShieldAlert, Fuel, TrendingDown } from "lucide-react";

const bars = [42, 56, 38, 71, 48, 63, 80, 55, 68, 44, 90, 72, 58, 84];

export function DieselOffset() {
  return (
    <div className="glass-card p-6 md:p-7 flex flex-col gap-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[11px] tracking-[0.22em] text-silver uppercase">Diesel Offset & Fuel Theft</p>
          <h3 className="text-lg font-semibold mt-1 tracking-tight">Revenue Intelligence</h3>
        </div>
        <span className="hairline rounded-full px-3 py-1 text-[10px] tracking-[0.18em] uppercase text-silver">
          24h · Live
        </span>
      </header>

      {/* Metric 1 */}
      <div>
        <p className="text-[10px] tracking-[0.22em] text-silver uppercase">Total Daily Monetary Offset</p>
        <p className="num mt-2 text-5xl md:text-6xl font-semibold tracking-tight"
           style={{ color: "oklch(0.82 0.16 165)", textShadow: "0 0 30px oklch(0.74 0.17 165 / 0.35)" }}>
          ₦2,481,500
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-silver">
          <TrendingDown className="h-3.5 w-3.5 text-[oklch(0.74_0.17_165)]" />
          <span>+12.4% vs. 7-day mean · diesel parity benchmark ₦1,180/L</span>
        </div>
      </div>

      {/* Theft Auditor */}
      <div className="rounded-xl hairline p-4"
        style={{ background: "linear-gradient(160deg, oklch(0.20 0.04 25 / 0.25), oklch(0.14 0.02 265 / 0.6))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="pulse-alert h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.24_25)]" />
            <p className="text-[11px] tracking-[0.22em] uppercase font-semibold text-[oklch(0.85_0.18_25)]">
              Theft Auditor Status: Vigilant
            </p>
          </div>
          <ShieldAlert className="h-4 w-4 text-[oklch(0.78_0.22_25)]" />
        </div>
        <div className="mt-3 space-y-1.5 font-mono text-[11.5px] leading-relaxed text-[oklch(0.85_0.16_25)]">
          <p>⚠ ALERT · 14:32:05 — 12L fuel volume drop anomaly blocked at Lekki Hub while asset was offline. System isolated.</p>
          <p className="text-silver/70">○ 11:08:42 — perimeter sensor handshake verified · Ikeja HQ</p>
          <p className="text-silver/70">○ 09:14:11 — encrypted fuel-flow checksum confirmed · Abuja Annex</p>
        </div>
      </div>
    </div>
  );
}
