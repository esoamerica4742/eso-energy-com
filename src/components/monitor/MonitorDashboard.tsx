import { useMemo } from "react";
import { useEnodeDevices } from "@/hooks/useEnodeDevices";
import { useEnodeLinkOverlay } from "@/hooks/useEnodeLinkOverlay";
import { MonitorEmptyState } from "@/components/monitor/MonitorEmptyState";
import { MonitorFleetHeader } from "@/components/monitor/MonitorFleetHeader";
import { MonitorTelemetryGrid } from "@/components/monitor/MonitorTelemetryGrid";
import { MonitorTabBar } from "@/components/monitor/MonitorTabBar";

export function MonitorDashboard() {
  const link = useEnodeLinkOverlay();
  const {
    data: devices = [],
    isLoading,
    isFetching,
    refetch,
  } = useEnodeDevices({ syncOnMount: true });

  const hasLiveAsset = useMemo(
    () =>
      devices.some(
        (d) =>
          d.connection_status === "connected" ||
          (d.production_rate_kw != null && d.production_rate_kw > 0),
      ),
    [devices],
  );

  const connectionTone: "offline" | "online" | "live" =
    hasLiveAsset ? "live" : devices.length > 0 ? "online" : "offline";
  const showEmpty = !isLoading && devices.length === 0;

  const onAddSite = () => {
    void link.mutateAsync().then(() => refetch());
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#080A0F] text-white">
      <MonitorFleetHeader
        siteLabel="Fleet site"
        inverterCount={devices.length}
        syncLabel={hasLiveAsset ? "Live telemetry" : "Awaiting sync"}
        connectionTone={connectionTone}
      />

      <main className="flex-1 px-4 py-6 pb-28">
        {isLoading ? (
          <p className="py-16 text-center text-sm text-zinc-500">Loading fleet telemetry…</p>
        ) : showEmpty ? (
          <MonitorEmptyState linking={link.isPending || isFetching} onAddSite={onAddSite} />
        ) : (
          <MonitorTelemetryGrid devices={devices} />
        )}
      </main>

      <MonitorTabBar active="monitor" />
    </div>
  );
}
