import { useEffect, useRef, useState } from "react";
import { Settings2, Flame, Cable, Fuel, X } from "lucide-react";
import { toast } from "sonner";
import { simStore, useSim, type SimState } from "@/lib/sim-store";

type ToggleDef = {
  key: keyof SimState;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  hue: string; // accent color
  onMsg: string;
  offMsg: string;
};

const TOGGLES: ToggleDef[] = [
  {
    key: "thermal",
    label: "Trigger Thermal Battery Stress",
    desc: "Forces Bank B into thermal-stress state.",
    icon: Flame,
    hue: "oklch(0.78 0.18 25)",
    onMsg: "Thermal stress simulation engaged",
    offMsg: "Battery thermals restored",
  },
  {
    key: "wiring",
    label: "Simulate Faulty Installer Wiring",
    desc: "Drops midday ingestion by 45% (12:00–14:00).",
    icon: Cable,
    hue: "oklch(0.86 0.16 75)",
    onMsg: "Wiring anomaly injected into audit graph",
    offMsg: "Wiring anomaly cleared",
  },
  {
    key: "diesel",
    label: "Simulate Diesel Fraud Activity",
    desc: "Injects an Abuja Hub fraud row into the matrix.",
    icon: Fuel,
    hue: "oklch(0.86 0.16 28)",
    onMsg: "Diesel fraud row injected · Abuja Hub",
    offMsg: "Diesel fraud row cleared",
  },
];

export function PitchSimPanel() {
  const sim = useSim();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeCount = Object.values(sim).filter(Boolean).length;

  const handleToggle = (t: ToggleDef) => {
    const next = !sim[t.key];
    simStore.set({ [t.key]: next } as Partial<SimState>);
    if (next) toast.success(t.onMsg);
    else toast.message(t.offMsg);
  };

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50">
      {/* Panel */}
      <div
        className="absolute bottom-14 right-0 w-[340px] origin-bottom-right transition-all duration-300"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "scale(1) translateY(0)" : "scale(0.92) translateY(8px)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div
          className="rounded-2xl backdrop-blur-2xl p-4"
          style={{
            background:
              "linear-gradient(160deg, oklch(0.18 0.02 265 / 0.85), oklch(0.13 0.015 265 / 0.85))",
            boxShadow:
              "inset 0 0 0 1px oklch(1 0 0 / 0.08), 0 24px 60px oklch(0 0 0 / 0.6), 0 0 40px oklch(0.78 0.13 86 / 0.12)",
          }}
        >
          <header className="flex items-center justify-between mb-3 px-1">
            <div>
              <p className="text-[9px] tracking-[0.32em] uppercase text-silver/70">
                Pitch Simulation
              </p>
              <p className="text-[12px] font-semibold mt-0.5">Live Demo Scenarios</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-silver/70 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </header>

          <ul className="space-y-2">
            {TOGGLES.map((t) => {
              const on = sim[t.key];
              const Icon = t.icon;
              return (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => handleToggle(t)}
                    className="group w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/[0.03]"
                    style={{
                      background: on
                        ? `linear-gradient(135deg, ${t.hue.replace("oklch(", "oklch(").replace(")", " / 0.10)")}, oklch(0.16 0.015 265 / 0.5))`
                        : "oklch(0.16 0.015 265 / 0.4)",
                      boxShadow: on
                        ? `inset 0 0 0 1px ${t.hue.replace(")", " / 0.45)")}, 0 0 24px ${t.hue.replace(")", " / 0.18)")}`
                        : "inset 0 0 0 1px oklch(1 0 0 / 0.06)",
                    }}
                  >
                    <span
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                      style={{
                        background: on ? t.hue.replace(")", " / 0.20)") : "oklch(1 0 0 / 0.04)",
                        color: on ? t.hue : "oklch(0.74 0.025 255)",
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold tracking-tight leading-tight">
                        {t.label}
                      </p>
                      <p className="text-[10px] text-silver/70 mt-0.5 leading-snug">{t.desc}</p>
                    </div>
                    {/* Switch */}
                    <span
                      className="relative h-5 w-9 shrink-0 mt-0.5 rounded-full transition-colors duration-300"
                      style={{
                        background: on
                          ? `linear-gradient(135deg, ${t.hue}, oklch(0.78 0.13 86))`
                          : "oklch(1 0 0 / 0.10)",
                        boxShadow: on
                          ? `0 0 18px ${t.hue.replace(")", " / 0.45)")}, inset 0 0 0 1px oklch(1 0 0 / 0.1)`
                          : "inset 0 0 0 1px oklch(1 0 0 / 0.12)",
                      }}
                    >
                      <span
                        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-300"
                        style={{ transform: on ? "translateX(18px)" : "translateX(2px)" }}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 px-1 text-[9px] tracking-[0.22em] uppercase text-silver/50">
            Internal · For sales demonstration only
          </p>
        </div>
      </div>

      {/* Gear trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Open pitch simulation panel"
        aria-expanded={open}
        className="relative h-11 w-11 rounded-full grid place-items-center backdrop-blur-xl transition-all hover:scale-105"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.20 0.02 265 / 0.85), oklch(0.13 0.015 265 / 0.85))",
          boxShadow: open
            ? "inset 0 0 0 1px oklch(0.78 0.13 86 / 0.5), 0 0 28px oklch(0.78 0.13 86 / 0.35)"
            : "inset 0 0 0 1px oklch(1 0 0 / 0.10), 0 8px 24px oklch(0 0 0 / 0.5)",
          color: "oklch(0.86 0.10 86)",
        }}
      >
        <Settings2
          className="h-4 w-4 transition-transform duration-500"
          style={{ transform: open ? "rotate(120deg)" : "rotate(0deg)" }}
        />
        {activeCount > 0 && (
          <span
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full grid place-items-center text-[9px] font-semibold num"
            style={{
              background: "linear-gradient(135deg, oklch(0.78 0.18 25), oklch(0.86 0.16 28))",
              color: "oklch(0.13 0.003 265)",
              boxShadow: "0 0 12px oklch(0.78 0.18 25 / 0.6)",
            }}
          >
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}
