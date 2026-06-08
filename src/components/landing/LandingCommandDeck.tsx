import { useEffect, useId, useRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useInverterIntelligence } from "@/hooks/useInverterIntelligence";
import { formatKw, formatPercent } from "@/lib/format";
import { telemetrySeriesForPulse } from "@/lib/inverterMetrics";
import { supabaseConfigured } from "@/lib/supabase-config";
import { useAuth } from "@/hooks/useAuth";
import { LandingAuthActions } from "@/components/landing/LandingAuthActions";
import { WebReadinessPanel } from "@/components/landing/WebReadinessPanel";

const TEAL = "#00F5D4";
const GOLD = "#F5CB5C";

const Z = { base: 0, hero: 10, deck: 20, cards: 30, header: 60 } as const;

/** Slow live-grid pulse — Framer Motion on web (Reanimated equivalent on native) */
const CARD_PULSE = {
  scale: [0.99, 1.01, 0.99],
  transition: { duration: 4.2, repeat: Infinity, ease: "easeInOut" as const },
};

export type UseIsUnlockedReturn = {
  isUnlocked: boolean;
  isVerifying: boolean;
  requestAccess: () => Promise<void>;
  resetAccess: () => void;
  toggleUnlocked: () => void;
};

/** Deck opens natively unlocked — no Request Access gate */
export function useIsUnlocked(): UseIsUnlockedReturn {
  const noop = async () => {};
  return {
    isUnlocked: true,
    isVerifying: false,
    requestAccess: noop,
    resetAccess: noop,
    toggleUnlocked: noop,
  };
}

export const useLandingUnlock = useIsUnlocked;

const PULSE_HEIGHT = 52;
const VB_H = 32;

function PowerPulseSvg({ values }: { values: number[] }) {
  const uid = useId().replace(/:/g, "");
  const gradId = `pulseGlow-${uid}`;
  const filterId = `pulseBloom-${uid}`;
  const baseline = VB_H * 0.52;

  const buildPath = (series: number[]) => {
    if (series.length < 2) {
      return `M0,${baseline} Q15,${baseline - 12} 30,${baseline} T60,${baseline} T90,${baseline - 8} T100,${baseline}`;
    }
    const max = Math.max(...series, 0.01);
    const min = Math.min(...series);
    const span = Math.max(max - min, 0.01);
    const pts = series.map((v, i) => {
      const x = (i / (series.length - 1)) * 100;
      const y = VB_H - 3 - ((v - min) / span) * (VB_H - 8);
      return `${x},${y}`;
    });
    return `M ${pts.join(" L ")}`;
  };

  const pathD = buildPath(values.length >= 2 ? values : []);

  return (
    <div
      className="w-full rounded-lg bg-[#00F5D4]/[0.04] px-1 py-2"
      style={{ height: PULSE_HEIGHT }}
    >
      <svg
        className="h-full w-full overflow-visible"
        viewBox={`0 0 100 ${VB_H}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={TEAL} stopOpacity={0.45} />
            <stop offset="50%" stopColor={TEAL} stopOpacity={1} />
            <stop offset="100%" stopColor={TEAL} stopOpacity={0.5} />
          </linearGradient>
          <filter id={filterId} x="-25%" y="-90%" width="150%" height="280%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={pathD}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
        />
      </svg>
    </div>
  );
}

function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2
      className={`font-mono text-sm font-black uppercase leading-none tracking-widest text-white ${className}`}
    >
      {children}
    </h2>
  );
}

function TealMetric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#00F5D4]/55">
        {label}
      </p>
      <p
        className={`mt-2.5 text-[2rem] font-black leading-none tracking-tighter drop-shadow-[0_0_28px_rgba(0,245,212,0.35)] ${
          accent ? "text-[#00F5D4]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function LandingCommandDeck() {
  const isUnlocked = true;
  const intel = useInverterIntelligence(isUnlocked);
  const { session } = useAuth();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current || !session || !supabaseConfigured) return;
    synced.current = true;
    void intel.sync();
  }, [session, intel]);

  const pulseValues = telemetrySeriesForPulse(intel.points);
  const loadKw = intel.loadKw ?? 1000;
  const efficiency = intel.efficiencyPct ?? 98.4;

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-black text-white">
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: Z.base }}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(245,203,92,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(0,245,212,0.07),transparent_45%)]" />
      </div>

      <header
        className="sticky top-0 flex items-center justify-between border-b border-zinc-800/60 bg-black/85 px-5 py-4 backdrop-blur-xl"
        style={{ zIndex: Z.header }}
      >
        <div>
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.28em] text-white">
            ESO ENERGY
          </p>
          <p className="mt-0.5 font-mono text-[9px] tracking-widest text-zinc-600">COMMAND DECK v2.6</p>
        </div>
        <div className="flex items-center gap-3">
          <LandingAuthActions variant="header" />
          <span className="hidden font-mono text-[10px] tracking-wider text-emerald-500 sm:inline">
            [● SECURE NODE]
          </span>
        </div>
      </header>

      <main className="relative flex-1 px-5 pb-10 pt-7" style={{ zIndex: Z.hero }}>
        <section className="mb-8 space-y-2.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#F5CB5C]">
            THE SOVEREIGN INFRASTRUCTURE
          </p>
          <h1
            className="font-sans text-[2.85rem] font-bold leading-[0.95] tracking-tighter text-white"
            style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
          >
            ESO ENERGY
          </h1>
          <p className="text-[15px] leading-relaxed text-zinc-400">
            Africa&apos;s Premier B2B Architecture for Hybrid Solar-Grid Orchestration, Fuel Security,
            and Real-Time Asset Intelligence.
          </p>
        </section>

        <div className="relative mb-4 grid grid-cols-1 gap-4" style={{ zIndex: Z.deck }}>
          <LandingAuthActions variant="hero" />
          <WebReadinessPanel />
        </div>

        <div className="relative grid grid-cols-1 gap-4" style={{ zIndex: Z.deck }}>
          {/* Card 1 — Inverter / electric teal */}
          <motion.article
            animate={CARD_PULSE}
            className="relative overflow-hidden rounded-2xl border border-[#00F5D4]/40 bg-gradient-to-br from-[#0a1014] via-[#0d1519] to-[#111a1f] p-5 shadow-[0_0_0_1px_rgba(0,245,212,0.12),0_0_40px_rgba(0,245,212,0.12),inset_0_1px_0_rgba(0,245,212,0.15)]"
            style={{ zIndex: Z.cards }}
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#00F5D4]/10 blur-3xl" />
            <div className="relative flex items-start justify-between gap-3">
              <CardTitle>INVERTER MONITORING INTELLIGENCE</CardTitle>
              <span
                className={`shrink-0 pt-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${
                  intel.isLive ? "text-[#00F5D4]" : "text-zinc-500"
                }`}
              >
                {intel.isLive ? "[● LIVE FLOW]" : "[○ SYNCING]"}
              </span>
            </div>

            {intel.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#00F5D4]" />
              </div>
            ) : (
              <div className="relative mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  <TealMetric label="CURRENT ARRAY LOAD" value={formatKw(loadKw)} />
                  <TealMetric
                    label="SYSTEM EFFICIENCY"
                    value={formatPercent(efficiency)}
                    accent
                  />
                </div>
                <PowerPulseSvg values={pulseValues.length >= 2 ? pulseValues : []} />
              </div>
            )}
          </motion.article>
        </div>
      </main>

      <footer
        className="border-t border-zinc-800/40 px-5 py-5 text-center"
        style={{ zIndex: Z.hero }}
      >
        <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-600">
          © 2026 ESO ENERGY INFRASTRUCTURES LTD.
        </p>
      </footer>
    </div>
  );
}
