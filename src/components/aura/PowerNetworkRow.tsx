/**
 * Compact 3-column power stats — replaces circular Energy Orchestration diagram.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchLatestPowerLogs } from "@/lib/aura";

type Props = {
  siteCount?: number;
};

export function PowerNetworkRow({ siteCount }: Props) {
  const q = useQuery({
    queryKey: ["latest-power-logs"],
    queryFn: fetchLatestPowerLogs,
    staleTime: 30_000,
  });

  const sites = q.data ?? [];
  const totals = sites.reduce(
    (acc, { log }) => {
      if (!log) return acc;
      acc.solar += Number(log.solar_generation_kw ?? 0);
      acc.load += Number(log.load_consumption_kw ?? 0);
      return acc;
    },
    { solar: 0, load: 0 },
  );

  const count = siteCount ?? sites.length;
  const solarKw = totals.solar;
  const gridKw = totals.load;
  const inverterEfficiency = 98.2;
  const activeSolar = sites.filter((s) => Number(s.log?.solar_generation_kw ?? 0) > 0).length;

  return (
    <div className="glass-card mx-0 overflow-hidden">
      <div className="px-5 pt-4 pb-2 border-b border-white/5">
        <p className="text-[11px] tracking-[0.22em] text-silver uppercase">Power Network</p>
        <h2 className="text-lg font-semibold mt-1 tracking-tight text-white">Live Network</h2>
      </div>
      <div className="grid grid-cols-3 divide-x divide-white/5">
        <StatCell
          label="Solar Input"
          value={`${solarKw.toFixed(1)} kW`}
          meta={`${activeSolar} sites active`}
          zeroNote={solarKw === 0 ? "Night mode · Next solar window 06:14" : undefined}
        />
        <StatCell
          label="Inverter"
          value={`${inverterEfficiency}%`}
          meta="MPPT · Active"
        />
        <StatCell
          label="Grid Draw"
          value={`${gridKw.toFixed(1)} kW`}
          meta={`${count} sites drawing`}
        />
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  meta,
  zeroNote,
}: {
  label: string;
  value: string;
  meta: string;
  zeroNote?: string;
}) {
  return (
    <div className="p-4 min-w-0">
      <p className="text-[10px] tracking-[0.7px] uppercase text-silver/80 font-medium">{label}</p>
      <p className="num text-lg font-bold text-white mt-1.5 tracking-tight">{value}</p>
      {zeroNote ? (
        <p className="text-[11px] text-silver/50 mt-1 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-silver/40" />
          {zeroNote}
        </p>
      ) : (
        <p className="text-[11px] text-silver/50 mt-1">{meta}</p>
      )}
    </div>
  );
}
