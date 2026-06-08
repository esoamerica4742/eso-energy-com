import { Sun, Zap, Battery } from "lucide-react";
import type { EnodeDevice } from "@/services/enode.types";
import { EnodeConnectionBadge } from "@/components/enode/EnodeConnectionBadge";

type Props = {
  device: EnodeDevice;
  onClick?: () => void;
};

export function EnodeDeviceCard({ device, onClick }: Props) {
  const Icon =
    device.device_type === "charger"
      ? Zap
      : device.device_type === "battery"
        ? Battery
        : Sun;

  const powerKw =
    device.production_rate_kw ??
    device.charge_rate_kw ??
    device.grid_power_kw ??
    0;

  const className =
    "glass-card p-5 w-full text-left transition-transform active:scale-[0.99]";

  const inner = (
    <>
      <div className="flex items-start gap-4">
        <span className="h-10 w-10 rounded-lg bg-emerald-500/10 grid place-items-center shrink-0">
          <Icon className="h-4 w-4 text-emerald-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white truncate">
            {device.display_name ?? device.vendor ?? "Energy device"}
          </p>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {device.vendor ?? device.device_type}
            {device.is_reachable ? " · Reachable" : " · Unreachable"}
          </p>
        </div>
        <EnodeConnectionBadge status={device.connection_status} />
      </div>
      <dl className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <dt className="text-[9px] uppercase tracking-wider text-zinc-500">Power</dt>
          <dd className="num text-sm font-semibold text-white mt-0.5">
            {Number(powerKw).toFixed(1)} kW
          </dd>
        </div>
        {device.battery_level_pct != null ? (
          <div>
            <dt className="text-[9px] uppercase tracking-wider text-zinc-500">Battery</dt>
            <dd className="num text-sm font-semibold text-white mt-0.5">
              {device.battery_level_pct}%
            </dd>
          </div>
        ) : (
          <div />
        )}
        <div>
          <dt className="text-[9px] uppercase tracking-wider text-zinc-500">Last seen</dt>
          <dd className="num text-sm font-semibold text-white mt-0.5">
            {device.last_seen_at
              ? new Date(device.last_seen_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </dd>
        </div>
      </dl>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} hover:bg-white/[0.02] cursor-pointer`}>
        {inner}
      </button>
    );
  }

  return <div className={className}>{inner}</div>;
}
