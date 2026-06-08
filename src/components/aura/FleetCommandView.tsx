import { useState } from "react";
import { Sun, Zap, Fuel, MapPin, Activity } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PowerSource = "solar" | "grid" | "diesel";

type Branch = {
  id: string;
  name: string;
  city: string;
  region: string;
  source: PowerSource;
  loadKw: number;
  batterySoc: number;
  uptime: string;
  // Approx % position on the Nigeria map placeholder (x: left%, y: top%)
  x: number;
  y: number;
};

const BRANCHES: Branch[] = [
  { id: "vi",  name: "Victoria Island Branch",   city: "Lagos",        region: "Lagos State",        source: "solar",  loadKw: 142.4, batterySoc: 88, uptime: "99.98%", x: 22, y: 78 },
  { id: "ab",  name: "Abuja Central Hub",        city: "Abuja",        region: "FCT",                source: "grid",   loadKw: 218.7, batterySoc: 64, uptime: "99.91%", x: 50, y: 50 },
  { id: "ph",  name: "Port Harcourt Supermarket",city: "Port Harcourt",region: "Rivers State",       source: "diesel", loadKw: 96.2,  batterySoc: 31, uptime: "99.62%", x: 48, y: 84 },
  { id: "kn",  name: "Kano Logistics Depot",     city: "Kano",         region: "Kano State",         source: "solar",  loadKw: 174.0, batterySoc: 92, uptime: "99.95%", x: 52, y: 20 },
  { id: "ib",  name: "Ibadan Regional Office",   city: "Ibadan",       region: "Oyo State",          source: "solar",  loadKw: 88.3,  batterySoc: 79, uptime: "99.93%", x: 28, y: 70 },
  { id: "en",  name: "Enugu Trade Centre",       city: "Enugu",        region: "Enugu State",        source: "grid",   loadKw: 121.5, batterySoc: 70, uptime: "99.88%", x: 56, y: 70 },
];

const SOURCE_META: Record<
  PowerSource,
  { label: string; fg: string; bg: string; ring: string; glow: string; pin: string; icon: typeof Sun }
> = {
  solar: {
    label: "Running on Solar",
    fg: "oklch(0.88 0.16 165)",
    bg: "oklch(0.30 0.10 165 / 0.18)",
    ring: "oklch(0.74 0.17 165 / 0.45)",
    glow: "oklch(0.74 0.17 165 / 0.55)",
    pin: "oklch(0.74 0.17 165)",
    icon: Sun,
  },
  grid: {
    label: "Using Grid Power",
    fg: "oklch(0.86 0.12 235)",
    bg: "oklch(0.30 0.10 235 / 0.18)",
    ring: "oklch(0.70 0.15 235 / 0.45)",
    glow: "oklch(0.70 0.15 235 / 0.55)",
    pin: "oklch(0.70 0.15 235)",
    icon: Zap,
  },
  diesel: {
    label: "Generator Active · Diesel Burning",
    fg: "oklch(0.88 0.16 75)",
    bg: "oklch(0.30 0.12 75 / 0.20)",
    ring: "oklch(0.78 0.17 75 / 0.5)",
    glow: "oklch(0.78 0.17 75 / 0.6)",
    pin: "oklch(0.78 0.17 75)",
    icon: Fuel,
  },
};

function StatusTag({ source }: { source: PowerSource }) {
  const m = SOURCE_META[source];
  const Icon = m.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase"
      style={{
        color: m.fg,
        background: m.bg,
        boxShadow: `inset 0 0 0 1px ${m.ring}, 0 0 18px ${m.glow}`,
      }}
    >
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

function NigeriaMap({
  onSelectPin,
}: {
  onSelectPin: (b: Branch) => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl hairline h-full min-h-[420px]"
      style={{
        background:
          "radial-gradient(120% 80% at 30% 20%, oklch(0.22 0.04 165 / 0.18), transparent 60%), radial-gradient(120% 80% at 80% 80%, oklch(0.22 0.05 235 / 0.18), transparent 60%), linear-gradient(160deg, oklch(0.16 0.02 265 / 0.7), oklch(0.13 0.015 265 / 0.7))",
      }}
    >
      {/* Grid lines */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.18]" aria-hidden>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="oklch(0.85 0.02 255)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Nigeria silhouette placeholder */}
      <svg
        viewBox="0 0 600 500"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <linearGradient id="ng-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.30 0.03 265 / 0.55)" />
            <stop offset="100%" stopColor="oklch(0.20 0.02 265 / 0.45)" />
          </linearGradient>
        </defs>
        {/* Stylised Nigeria outline (approximate) */}
        <path
          d="M 90 110 L 200 70 L 320 80 L 430 70 L 520 110 L 540 200 L 510 290 L 500 360 L 430 410 L 360 430 L 320 460 L 270 450 L 230 420 L 190 410 L 150 380 L 120 320 L 95 250 L 80 180 Z"
          fill="url(#ng-fill)"
          stroke="oklch(0.78 0.13 86 / 0.35)"
          strokeWidth="1.2"
        />
      </svg>

      {/* Pins */}
      {BRANCHES.map((b) => {
        const m = SOURCE_META[b.source];
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelectPin(b)}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-transform active:scale-95 focus:outline-none"
            style={{ left: `${b.x}%`, top: `${b.y}%` }}
            aria-label={`${b.city} branch`}
          >
            <span
              className="block h-2.5 w-2.5 rounded-full ticker-dot"
              style={{ background: m.pin, boxShadow: `0 0 0 4px ${m.bg}, 0 0 16px ${m.glow}` }}
            />
            <span
              className="text-[9px] tracking-[0.08em] uppercase font-medium"
              style={{ color: m.fg }}
            >
              {b.city}
            </span>
          </button>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-xl hairline px-3 py-2 backdrop-blur-md"
        style={{ background: "oklch(0.13 0.003 265 / 0.6)" }}>
        <p className="text-[10px] tracking-[0.22em] uppercase text-silver/80">
          <MapPin className="inline h-3 w-3 mr-1" /> Nigeria · {BRANCHES.length} sites
        </p>
        <div className="flex items-center gap-3 text-[10px] text-silver">
          {(["solar", "grid", "diesel"] as PowerSource[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: SOURCE_META[s].pin }} />
              {s === "solar" ? "Solar" : s === "grid" ? "Grid" : "Diesel"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function BranchCard({
  branch,
  selected,
  onClick,
}: {
  branch: Branch;
  selected: boolean;
  onClick: () => void;
}) {
  const m = SOURCE_META[branch.source];
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group glass-card relative overflow-hidden p-4 transition-all duration-300 hover:-translate-y-1 cursor-pointer focus:outline-none ${
        selected ? "ring-1 ring-[oklch(0.78_0.13_86_/_0.6)]" : ""
      }`}
      style={{
        boxShadow: selected
          ? "0 12px 48px oklch(0 0 0 / 0.6), 0 0 28px oklch(0.78 0.13 86 / 0.35)"
          : "0 8px 40px oklch(0 0 0 / 0.5)",
      }}
    >
      {/* Accent rail */}
      <span
        className="absolute left-0 top-0 h-full w-px"
        style={{ background: `linear-gradient(180deg, transparent, ${m.pin}, transparent)` }}
        aria-hidden
      />

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.22em] uppercase text-silver/80">{branch.region}</p>
          <h3 className="mt-1 text-[15px] font-semibold tracking-tight truncate">{branch.name}</h3>
        </div>
        <span
          className="shrink-0 h-8 w-8 rounded-lg hairline grid place-items-center transition-transform duration-300 group-hover:scale-110"
          style={{ background: m.bg, color: m.fg, boxShadow: `0 0 18px ${m.glow}` }}
        >
          <m.icon className="h-3.5 w-3.5" />
        </span>
      </header>

      <div className="mt-3">
        <StatusTag source={branch.source} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg hairline py-2" style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
          <dt className="text-[9px] tracking-[0.18em] uppercase text-silver/70">Load</dt>
          <dd className="num text-[13px] font-semibold mt-0.5">{branch.loadKw.toFixed(1)} <span className="text-silver/70 text-[10px]">kW</span></dd>
        </div>
        <div className="rounded-lg hairline py-2" style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
          <dt className="text-[9px] tracking-[0.18em] uppercase text-silver/70">Battery</dt>
          <dd className="num text-[13px] font-semibold mt-0.5" style={{ color: branch.batterySoc < 40 ? "oklch(0.85 0.16 75)" : "oklch(0.88 0.16 165)" }}>
            {branch.batterySoc}%
          </dd>
        </div>
        <div className="rounded-lg hairline py-2" style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
          <dt className="text-[9px] tracking-[0.18em] uppercase text-silver/70">Uptime</dt>
          <dd className="num text-[13px] font-semibold mt-0.5">{branch.uptime}</dd>
        </div>
      </dl>
    </article>
  );
}

type FleetProps = {
  selectedId?: string | null;
  onSelect?: (b: { id: string; name: string } | null) => void;
};

export function FleetCommandView({ selectedId, onSelect }: FleetProps = {}) {
  const [mapPin, setMapPin] = useState<Branch | null>(null);
  const counts = BRANCHES.reduce(
    (acc, b) => {
      acc[b.source] += 1;
      return acc;
    },
    { solar: 0, grid: 0, diesel: 0 } as Record<PowerSource, number>,
  );

  return (
    <section className="glass-card p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] tracking-[0.32em] uppercase text-silver">Fleet sites</p>
          <h2 className="mt-1 text-2xl md:text-[28px] font-semibold tracking-tight">
            <span className="shimmer-text">{BRANCHES.length} branches</span> · live status
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill icon={<Sun className="h-3 w-3" />} label={`${counts.solar} Solar`}  source="solar" />
          <Pill icon={<Zap className="h-3 w-3" />}  label={`${counts.grid} Grid`}   source="grid" />
          <Pill icon={<Fuel className="h-3 w-3" />} label={`${counts.diesel} Diesel`} source="diesel" />
          <span className="inline-flex items-center gap-1.5 text-[11px] text-silver ml-1">
            <Activity className="h-3 w-3" /> Realtime · 60 Hz
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <NigeriaMap onSelectPin={(b) => setMapPin(b)} />
        </div>
        <div className="lg:col-span-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BRANCHES.map((b) => (
              <BranchCard
                key={b.id}
                branch={b}
                selected={selectedId === b.id}
                onClick={() => {
                  if (selectedId === b.id) onSelect?.(null);
                  else onSelect?.({ id: b.id, name: b.name });
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <Sheet open={!!mapPin} onOpenChange={(o) => !o && setMapPin(null)}>
        <SheetContent side="bottom" className="bg-[#121211] border-white/10">
          {mapPin && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{mapPin.name}</SheetTitle>
              </SheetHeader>
              <p className="text-sm text-zinc-400 mt-1">{mapPin.city} · {mapPin.region}</p>
              <div className="mt-3">
                <StatusTag source={mapPin.source} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-zinc-500 text-[10px] uppercase">Load</dt>
                  <dd className="num font-semibold text-white">{mapPin.loadKw.toFixed(1)} kW</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 text-[10px] uppercase">Battery</dt>
                  <dd className="num font-semibold text-white">{mapPin.batterySoc}%</dd>
                </div>
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function Pill({ icon, label, source }: { icon: React.ReactNode; label: string; source: PowerSource }) {
  const m = SOURCE_META[source];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase"
      style={{ color: m.fg, background: m.bg, boxShadow: `inset 0 0 0 1px ${m.ring}` }}
    >
      {icon}
      {label}
    </span>
  );
}
