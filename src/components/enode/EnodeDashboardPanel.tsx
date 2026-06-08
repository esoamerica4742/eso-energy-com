import { useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plug, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useEnodeDevices, ENODE_DEVICES_KEY } from "@/hooks/useEnodeDevices";
import { useEnodeDevice } from "@/hooks/useEnodeDevice";
import { EnodeDeviceCard } from "@/components/enode/EnodeDeviceCard";
import { EnodePowerChart } from "@/components/enode/EnodePowerChart";
import { enodeClient, EnodeApiError } from "@/services/enode";

export function EnodeDashboardPanel() {
  const queryClient = useQueryClient();
  const {
    data: devices = [],
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useEnodeDevices();

  const primaryId = devices[0]?.id;
  const { data: primaryDevice } = useEnodeDevice(primaryId);

  const errorMessage = useMemo(() => {
    if (!isError) return null;
    if (error instanceof EnodeApiError && error.status === 401) {
      return "Sign in to connect Enode devices";
    }
    return "Unable to reach Enode — retry or check edge function deployment";
  }, [isError, error]);

  const onSync = useCallback(async () => {
    try {
      await enodeClient.syncAll();
      await refetch();
      toast.success("Enode devices synced");
    } catch (err) {
      await refetch();
      toast.error("Sync failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }, [refetch]);

  if (!isLoading && devices.length === 0) {
    return (
      <section className="space-y-4">
        <SectionHeading meta="NOT CONNECTED">Enode devices</SectionHeading>
        <Link
          to="/link-device"
          className="glass-card flex items-center gap-4 p-5 hover:bg-white/[0.02] transition-colors group"
        >
          <span className="h-10 w-10 rounded-lg bg-blue-500/10 grid place-items-center">
            <Plug className="h-5 w-5 text-blue-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white group-hover:text-[#E8D5A3] transition-colors">
              Connect inverter or charger
            </p>
            <p className="text-[13px] text-zinc-500 mt-1">
              Secure OAuth via Enode — same flow as Stripe Connect
            </p>
          </div>
        </Link>
      </section>
    );
  }

  const device = primaryDevice ?? devices[0];

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading meta={device?.connection_status?.toUpperCase() ?? "SYNCING"}>
          Enode live
        </SectionHeading>
        <button
          type="button"
          onClick={() => void onSync()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Sync
        </button>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-300">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void onSync()}
            className="text-[11px] font-mono text-red-200 hover:text-white shrink-0"
          >
            Retry
          </button>
        </div>
      ) : null}

      {device ? (
        <div className="space-y-4">
          <EnodeDeviceCard device={device} />
          <EnodePowerChart deviceId={device.id} />
          <Link
            to="/link-device"
            className="text-[11px] font-mono text-zinc-500 hover:text-[#D4AF37]"
          >
            Manage connections →
          </Link>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-zinc-500 py-8 text-center">Loading devices…</p>
      ) : null}
    </section>
  );
}

function SectionHeading({
  children,
  meta,
}: {
  children: React.ReactNode;
  meta?: string;
}) {
  return (
    <div>
      <h2 className="text-[11px] font-mono tracking-[0.28em] uppercase text-zinc-500">
        {children}
      </h2>
      {meta ? (
        <p className="text-[10px] font-mono text-zinc-600 mt-1">{meta}</p>
      ) : null}
    </div>
  );
}
