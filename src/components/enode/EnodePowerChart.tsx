import { useEnodeTelemetry } from "@/hooks/useEnodeTelemetry";

type Props = { deviceId: string };

export function EnodePowerChart({ deviceId }: Props) {
  const { data: points = [], isLoading, isError } = useEnodeTelemetry(deviceId);

  if (isLoading) {
    return (
      <div className="glass-card p-6 min-h-[160px] flex items-center justify-center text-sm text-zinc-500">
        Loading power history…
      </div>
    );
  }

  if (isError || points.length === 0) {
    return (
      <div className="glass-card p-6 min-h-[120px] flex items-center justify-center text-sm text-zinc-500">
        Power history appears after the first device sync
      </div>
    );
  }

  const max = Math.max(
    ...points.map((p) => Math.max(Number(p.production_kw), Number(p.grid_kw))),
    0.1,
  );
  const w = 400;
  const h = 80;

  const solarPts = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * w;
      const y = h - (Number(p.production_kw) / max) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  const gridPts = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * w;
      const y = h - (Number(p.grid_kw) / max) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="glass-card p-5">
      <p className="text-[10px] tracking-[0.22em] uppercase text-zinc-500 mb-3">
        Power flow · 24h
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" aria-hidden>
        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeLinecap="round"
          points={solarPts}
        />
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeLinecap="round"
          points={gridPts}
        />
      </svg>
      <div className="flex gap-4 mt-2 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Production
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Grid / charge
        </span>
      </div>
    </div>
  );
}
