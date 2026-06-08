import type { EnodeConnectionStatus } from "@/services/enode.types";

const CONFIG: Record<EnodeConnectionStatus, { color: string; label: string }> = {
  connected: { color: "#10b981", label: "Connected" },
  syncing: { color: "#f59e0b", label: "Syncing" },
  error: { color: "#ef4444", label: "Error" },
  offline: { color: "#64748b", label: "Offline" },
};

export function EnodeConnectionBadge({ status }: { status: EnodeConnectionStatus }) {
  const cfg = CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${status === "syncing" ? "animate-pulse" : ""}`}
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}
