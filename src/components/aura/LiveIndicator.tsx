import { motion } from "framer-motion";

export type ConnectionStatus = "live" | "reconnecting" | "offline";

const CONFIG: Record<ConnectionStatus, { color: string; label: string }> = {
  live: { color: "#10b981", label: "Live" },
  reconnecting: { color: "#f59e0b", label: "Reconnecting..." },
  offline: { color: "#ef4444", label: "Offline" },
};

export function LiveIndicator({ status }: { status: ConnectionStatus }) {
  const cfg = CONFIG[status];
  return (
    <motion.div
      className="flex items-center gap-1.5"
      animate={status === "reconnecting" ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
      transition={status === "reconnecting" ? { duration: 1.2, repeat: Infinity } : {}}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
      <span className="text-[11px] text-silver font-medium">{cfg.label}</span>
    </motion.div>
  );
}

export function ConnectionOfflineBanner({
  lastUpdated,
}: {
  lastUpdated?: string;
}) {
  return (
    <div
      className="px-5 py-2 flex items-center gap-2 text-[12px] font-medium"
      style={{ background: "rgba(239,68,68,0.10)", color: "#f87171" }}
    >
      Connection lost · Last updated {lastUpdated ?? "unknown"}
    </div>
  );
}
