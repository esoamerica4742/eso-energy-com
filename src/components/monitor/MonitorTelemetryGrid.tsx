import type { EnodeDevice } from "@/services/enode.types";

type Props = {
  devices: EnodeDevice[];
};

function formatKw(value: number | null | undefined) {
  const kw = value ?? 0;
  if (kw >= 1000) return `${(kw / 1000).toFixed(2)} MW`;
  return `${kw.toFixed(1)} kW`;
}

export function MonitorTelemetryGrid({ devices }: Props) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {devices.map((device) => {
        const live = device.connection_status === "connected";
        const production = device.production_rate_kw ?? 0;

        return (
          <article
            key={device.id}
            className="rounded-2xl border border-white/[0.08] bg-[#0B1018]/80 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-mono tracking-[0.22em] text-zinc-500 uppercase">
                  {device.vendor ?? "Inverter"} · {device.device_type}
                </p>
                <h3 className="mt-1 truncate text-[15px] font-semibold text-white">
                  {device.display_name ?? device.enode_device_id}
                </h3>
              </div>
              <span
                className={
                  live
                    ? "rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-300"
                    : "rounded-full border border-zinc-600/50 px-2.5 py-1 text-[10px] font-bold tracking-wider text-zinc-500"
                }
              >
                {live ? "LIVE" : "SYNC"}
              </span>
            </div>

            <p className="mt-5 text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
              Solar output
            </p>
            <p className="mt-1 text-[36px] font-bold leading-none tracking-tight text-[#F5C842]">
              {formatKw(production)}
            </p>

            {device.battery_level_pct != null ? (
              <p className="mt-3 text-[12px] text-zinc-500">
                Battery{" "}
                <span className="font-semibold text-zinc-300">{device.battery_level_pct}%</span>
              </p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
