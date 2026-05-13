import { ShieldAlert, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchDailyOffsetNaira, fetchActiveAlerts } from "@/lib/aura";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "oklch(0.85 0.18 25)",
  high: "oklch(0.85 0.18 25)",
  warning: "oklch(0.85 0.16 75)",
  medium: "oklch(0.85 0.16 75)",
  info: "oklch(0.82 0.04 255)",
  low: "oklch(0.82 0.04 255)",
};

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function DieselOffset() {
  const offset = useQuery({
    queryKey: ["daily-offset", "24h"],
    queryFn: fetchDailyOffsetNaira,
    staleTime: 30_000,
  });
  const alerts = useQuery({
    queryKey: ["security-alerts", "active"],
    queryFn: () => fetchActiveAlerts(4),
    staleTime: 30_000,
  });

  const total = offset.data ?? 0;
  const naira = total.toLocaleString("en-NG");

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

      <div>
        <p className="text-[10px] tracking-[0.22em] text-silver uppercase">Total Daily Monetary Offset</p>
        <p
          className="num mt-2 text-5xl md:text-6xl font-semibold tracking-tight"
          style={{ color: "oklch(0.82 0.16 165)", textShadow: "0 0 30px oklch(0.74 0.17 165 / 0.35)" }}
        >
          {offset.isLoading ? "₦—" : `₦${naira}`}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-silver">
          <TrendingDown className="h-3.5 w-3.5 text-[oklch(0.74_0.17_165)]" />
          <span>Diesel parity benchmark ₦1,180/L · streamed from power_logs</span>
        </div>
      </div>

      <div
        className="rounded-xl hairline p-4"
        style={{ background: "linear-gradient(160deg, oklch(0.20 0.04 25 / 0.25), oklch(0.14 0.02 265 / 0.6))" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="pulse-alert h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.24_25)]" />
            <p className="text-[11px] tracking-[0.22em] uppercase font-semibold text-[oklch(0.85_0.18_25)]">
              Theft Auditor Status: Vigilant
            </p>
          </div>
          <ShieldAlert className="h-4 w-4 text-[oklch(0.78_0.22_25)]" />
        </div>
        <div className="mt-3 space-y-1.5 font-mono text-[11.5px] leading-relaxed">
          {alerts.isLoading && <p className="text-silver/70">○ syncing security ledger…</p>}
          {!alerts.isLoading && (alerts.data?.length ?? 0) === 0 && (
            <p className="text-silver/70">○ no active alerts · perimeter quiet</p>
          )}
          {alerts.data?.map((a) => {
            const color = SEVERITY_COLOR[a.severity?.toLowerCase()] ?? "oklch(0.82 0.04 255)";
            const isCrit = ["critical", "high"].includes(a.severity?.toLowerCase());
            return (
              <p key={a.id} style={{ color }}>
                {isCrit ? "⚠" : "○"} {fmtTime(a.created_at)} — {a.alert_type}: {a.message}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
