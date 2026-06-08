import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AlertTriangle, Battery, Fuel, Wifi } from "lucide-react";

export const Route = createFileRoute("/alerts")({
  component: AlertsPage,
});

const ALERTS = [
  {
    id: "1",
    severity: "critical" as const,
    icon: Fuel,
    title: "Diesel runtime exceeded threshold",
    site: "Port Harcourt Supermarket",
    time: "2 minutes ago",
  },
  {
    id: "2",
    severity: "warning" as const,
    icon: Battery,
    title: "Battery below 30% — grid switch recommended",
    site: "Ibadan Regional Office",
    time: "18 minutes ago",
  },
  {
    id: "3",
    severity: "info" as const,
    icon: Wifi,
    title: "Grid power restored — diesel generator stopped",
    site: "Abuja Central Hub",
    time: "1 hour ago",
  },
];

function AlertsPage() {
  return (
    <DashboardShell title="Alerts" subtitle="Notifications across your fleet">
      <div className="space-y-3 max-w-3xl">
        {ALERTS.map((a) => {
          const Icon = a.icon;
          const border =
            a.severity === "critical"
              ? "#ef4444"
              : a.severity === "warning"
                ? "#f97316"
                : "#3b82f6";
          return (
            <article
              key={a.id}
              className="glass-card flex gap-4 p-4 min-h-[72px] transition-transform duration-150 active:scale-[0.99]"
              style={{ borderLeft: `2px solid ${border}` }}
            >
              <span
                className="h-9 w-9 rounded-lg grid place-items-center shrink-0"
                style={{
                  background:
                    a.severity === "critical"
                      ? "rgba(239,68,68,0.12)"
                      : a.severity === "warning"
                        ? "rgba(249,115,22,0.12)"
                        : "rgba(96,165,250,0.12)",
                  color: border,
                }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{a.title}</p>
                <p className="text-[12px] text-zinc-500 mt-1">
                  {a.site} · {a.time}
                </p>
              </div>
            </article>
          );
        })}
        {ALERTS.length === 0 && (
          <div className="glass-card p-12 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-emerald-400 mb-3" />
            <p className="text-white font-medium">All clear</p>
            <p className="text-sm text-zinc-500 mt-1">No active alerts across your fleet</p>
          </div>
        )}
      </div>
      <p className="mt-6 text-[11px] text-zinc-600">
        <Link to="/dashboard" className="text-[#D4AF37] hover:underline">
          ← Back to dashboard
        </Link>
      </p>
    </DashboardShell>
  );
}
