import { createFileRoute } from "@tanstack/react-router";
import { TopHeader } from "@/components/aura/TopHeader";
import { ExecutiveRibbons } from "@/components/aura/ExecutiveRibbons";
import { EnergyFlow } from "@/components/aura/EnergyFlow";
import { FleetCommandView } from "@/components/aura/FleetCommandView";
import { DieselBurden } from "@/components/aura/DieselBurden";
import { ThermalLoadTracker } from "@/components/aura/ThermalLoadTracker";
import { BatteryLifespanGuard } from "@/components/aura/BatteryLifespanGuard";
import { ExecutiveReporting } from "@/components/aura/ExecutiveReporting";
import { LogoutOverlay } from "@/components/aura/LogoutOverlay";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Command Deck · ESO ENERGY" },
      {
        name: "description",
        content:
          "Live operational command deck for ESO ENERGY — fleet telemetry, energy orchestration, diesel security, and battery intelligence.",
      },
    ],
  }),
});

function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-foreground">
      <TopHeader />
      <main className="mx-auto max-w-[1440px] px-5 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
        <section>
          <div className="mb-5">
            <p className="text-[11px] tracking-[0.22em] text-silver uppercase">Command Deck</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight shimmer-text mt-1">
              Sovereign Operations Overview
            </h1>
          </div>
          <ExecutiveRibbons siteLabel="Pan-African Mesh" />
        </section>

        <section>
          <EnergyFlow />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <FleetCommandView />
          </div>
          <div>
            <DieselBurden />
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThermalLoadTracker siteLabel="Pan-African Mesh" />
          <BatteryLifespanGuard />
        </section>

        <section>
          <ExecutiveReporting />
        </section>
      </main>
      <LogoutOverlay />
    </div>
  );
}
