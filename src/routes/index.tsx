import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Filter, X } from "lucide-react";
import { TopHeader } from "@/components/aura/TopHeader";
import { EnergyFlow } from "@/components/aura/EnergyFlow";
import { DieselOffset } from "@/components/aura/DieselOffset";
import { DieselBurden } from "@/components/aura/DieselBurden";
import { FleetCommand } from "@/components/aura/FleetCommand";
import { FleetCommandView } from "@/components/aura/FleetCommandView";
import { BatteryLifespanGuard } from "@/components/aura/BatteryLifespanGuard";
import { ContractorAuditTool } from "@/components/aura/ContractorAuditTool";
import { ExecutiveRibbons } from "@/components/aura/ExecutiveRibbons";
import { ExecutiveReporting } from "@/components/aura/ExecutiveReporting";
import { ThermalLoadTracker } from "@/components/aura/ThermalLoadTracker";
import { PitchSimPanel } from "@/components/aura/PitchSimPanel";
import { DevSeeder } from "@/components/aura/DevSeeder";
import { useRealtimeTelemetry } from "@/hooks/useRealtimeTelemetry";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "AURA Enterprise · Sovereign Energy Orchestration" },
      { name: "description", content: "Hardware-agnostic Energy Management System for elite African corporations, premium banking fleets, and luxury estates." },
    ],
  }),
});

function Index() {
  const { session, user, loading } = useAuth();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Operator";
  const navigate = useNavigate();
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 700);
    return () => clearTimeout(t);
  }, []);

  useRealtimeTelemetry();

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-silver">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      <TopHeader />
      <main className="mx-auto max-w-[1440px] px-5 md:px-8 py-6 md:py-8">
        {/* Eyebrow */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[10px] tracking-[0.32em] text-silver uppercase">Command Deck · 14 May 2026 · 14:36 WAT</p>
            <h1 className="mt-1 text-2xl md:text-[28px] font-semibold tracking-tight">
              Good afternoon, <span className="shimmer-text">{displayName}</span>. Three sites are streaming nominally.
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-silver">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.74_0.17_165)] ticker-dot" />
            All telemetry channels healthy
          </div>
        </div>

        {/* 1 · Executive Summary Ribbons */}
        {hydrated ? (
          <ExecutiveRibbons siteLabel={selected?.name} />
        ) : (
          <RibbonSkeleton />
        )}

        {/* Thin translucent divider */}
        <Divider />

        {/* 2 · Multi-Site Fleet Command View (interactive) */}
        <FleetCommandView selectedId={selected?.id ?? null} onSelect={setSelected} />

        {/* Filter banner */}
        {selected && (
          <div
            className="mt-4 flex items-center justify-between gap-3 rounded-xl hairline px-4 py-2.5 backdrop-blur-md"
            style={{
              background: "oklch(0.30 0.10 86 / 0.10)",
              boxShadow: "inset 0 0 0 1px oklch(0.78 0.13 86 / 0.35), 0 0 24px oklch(0.78 0.13 86 / 0.18)",
            }}
          >
            <p className="text-[11px] tracking-[0.22em] uppercase text-silver flex items-center gap-2">
              <Filter className="h-3.5 w-3.5" style={{ color: "oklch(0.92 0.12 86)" }} />
              Analytics filtered to <span className="text-[oklch(0.92_0.12_86)] font-semibold tracking-normal normal-case ml-1">{selected.name}</span>
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-silver hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        )}

        <Divider />

        {/* 3 · Battery Lifespan Guard (ring + alert) */}
        <div key={`bg-${selected?.id ?? "all"}`}>
          <BatteryLifespanGuard />
        </div>

        {/* Thermal & Load historical chart */}
        <div className="mt-6">
          <ThermalLoadTracker siteLabel={selected?.name} />
        </div>

        <Divider />

        {/* 4 · Contractor Audit Graph */}
        <div key={`ca-${selected?.id ?? "all"}`}>
          <ContractorAuditTool />
        </div>

        <Divider />

        {/* 5 · Executive Reporting & Diesel Fraud Audit Hub */}
        <ExecutiveReporting />

        <Divider />

        {/* Hero Energy Flow */}
        <div>
          <EnergyFlow />
        </div>

        {/* Two-column secondary grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <DieselOffset />
          </div>
          <div className="lg:col-span-7">
            <FleetCommand />
          </div>
          <div className="lg:col-span-12">
            <DieselBurden />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[11px] text-silver">
          <p className="tracking-[0.22em] uppercase">AURA Enterprise · v4.2 · Build 2026.05.14</p>
          <p className="font-mono">PoP · Lagos · Frankfurt · Johannesburg · Encrypted Mesh</p>
        </footer>
      </main>
      <DevSeeder />
    </div>
  );
}

function Divider() {
  return (
    <div
      className="my-8 h-px w-full"
      style={{
        background:
          "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.10) 20%, oklch(0.78 0.13 86 / 0.25) 50%, oklch(1 0 0 / 0.10) 80%, transparent)",
      }}
      aria-hidden
    />
  );
}

function RibbonSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {[7, 5].map((span, i) => (
        <div
          key={i}
          className={`glass-card p-6 md:p-7 lg:col-span-${span} h-[220px] relative overflow-hidden`}
        >
          <div className="h-3 w-40 rounded-full bg-[oklch(1_0_0_/_0.06)] animate-pulse" />
          <div className="mt-4 h-10 w-56 rounded-md bg-[oklch(1_0_0_/_0.06)] animate-pulse" />
          <div className="mt-6 h-2 w-full rounded-full bg-[oklch(1_0_0_/_0.06)] animate-pulse" />
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-14 rounded-xl bg-[oklch(1_0_0_/_0.05)] animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

