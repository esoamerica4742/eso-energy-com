import { createFileRoute } from "@tanstack/react-router";
import { MonitorDashboard } from "@/components/monitor/MonitorDashboard";

export const Route = createFileRoute("/monitor")({
  component: MonitorPage,
  head: () => ({
    meta: [
      { title: "Monitor · ESO ENERGY" },
      {
        name: "description",
        content: "Fleet grid intelligence — live inverter telemetry via Enode.",
      },
    ],
  }),
});

function MonitorPage() {
  return <MonitorDashboard />;
}
