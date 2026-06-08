import { cn } from "@/lib/utils";

type ConnectionTone = "offline" | "online" | "live";

type Props = {
  siteLabel?: string;
  inverterCount?: number;
  syncLabel?: string;
  connectionTone?: ConnectionTone;
  tierLabel?: string;
};

function connectionStyles(tone: ConnectionTone) {
  if (tone === "online" || tone === "live") {
    return {
      badge:
        "border-emerald-400/45 bg-emerald-500/12 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.35)]",
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]",
      label: tone === "live" ? "LIVE" : "ONLINE",
    };
  }
  return {
    badge: "border-slate-500/40 bg-slate-800/40 text-slate-400",
    dot: "bg-slate-500/80",
    label: "OFFLINE",
  };
}

export function MonitorFleetHeader({
  siteLabel = "Fleet site",
  inverterCount = 0,
  syncLabel = "Awaiting sync",
  connectionTone = "offline",
  tierLabel = "SOVEREIGN FLEET TIER",
}: Props) {
  const conn = connectionStyles(connectionTone);

  return (
    <header className="border-b border-white/[0.06] bg-[#060809] px-5 pt-5 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-tight text-white leading-none">
            ESO ENERGY
          </h1>
          <p className="mt-1 text-[11px] font-semibold tracking-[0.28em] text-[#D4AF37]">
            GRID INTELLIGENCE
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-[0.14em]",
            conn.badge,
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", conn.dot)} />
          {conn.label}
        </span>
      </div>

      <p className="mt-3 text-[13px] text-zinc-500">
        {siteLabel} · {inverterCount} inverter{inverterCount === 1 ? "" : "s"} · {syncLabel}
      </p>

      <span className="mt-3 inline-flex rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/[0.08] px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-[#E8D5A3]">
        {tierLabel}
      </span>
    </header>
  );
}
