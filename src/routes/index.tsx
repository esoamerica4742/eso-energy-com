import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { TopHeader } from "@/components/aura/TopHeader";
import { EnergyFlow } from "@/components/aura/EnergyFlow";
import { DieselOffset } from "@/components/aura/DieselOffset";
import { DieselBurden } from "@/components/aura/DieselBurden";
import { FleetCommand } from "@/components/aura/FleetCommand";
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
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

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
              Good afternoon, <span className="shimmer-text">Mr. Adeyemi</span>. Three sites are streaming nominally.
            </h1>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-silver">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.74_0.17_165)] ticker-dot" />
            All telemetry channels healthy
          </div>
        </div>

        {/* Hero Energy Flow */}
        <EnergyFlow />

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
        <footer className="mt-10 pt-6 border-t border-[oklch(0.30_0.03_265_/_0.5)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-silver">
          <p className="tracking-[0.22em] uppercase">AURA Enterprise · v4.2 · Build 2026.05.14</p>
          <p className="font-mono">PoP · Lagos · Frankfurt · Johannesburg · Encrypted Mesh</p>
        </footer>
      </main>
      <DevSeeder />
    </div>
  );
}
