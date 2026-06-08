import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardQuickStats } from "@/components/dashboard/DashboardQuickStats";
import { ExecutiveRibbons } from "@/components/aura/ExecutiveRibbons";
import { PowerNetworkRow } from "@/components/aura/PowerNetworkRow";
import { FleetCommandView } from "@/components/aura/FleetCommandView";
import { DieselBurden } from "@/components/aura/DieselBurden";
import { ThermalLoadTracker } from "@/components/aura/ThermalLoadTracker";
import { BatteryLifespanGuard } from "@/components/aura/BatteryLifespanGuard";
import { ExecutiveReporting } from "@/components/aura/ExecutiveReporting";
import { LogoutOverlay } from "@/components/aura/LogoutOverlay";
import { EnodeDashboardPanel } from "@/components/enode/EnodeDashboardPanel";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard · ESO ENERGY" },
      {
        name: "description",
        content:
          "B2B solar monitoring — fleet telemetry, diesel savings, and battery health across Africa.",
      },
    ],
  }),
});

function DashboardPage() {
  return (
    <DashboardShell
      subtitle="Fleet operations · B2B solar monitoring"
      title="Dashboard"
    >
      <div className="space-y-8">
        <DashboardQuickStats />

        <section id="energy" className="scroll-mt-24 space-y-5">
          <SectionLabel>Executive Performance</SectionLabel>
          <ExecutiveRibbons />
        </section>

        <section className="scroll-mt-24">
          <SectionLabel>Power network</SectionLabel>
          <PowerNetworkRow siteCount={6} />
        </section>

        <section id="enode" className="scroll-mt-24">
          <EnodeDashboardPanel />
        </section>

        <section id="fleet" className="scroll-mt-24 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-5">
            <SectionLabel>Fleet Command</SectionLabel>
            <FleetCommandView />
          </div>
          <div id="diesel" className="scroll-mt-24 space-y-5">
            <SectionLabel>Diesel Security</SectionLabel>
            <DieselBurden />
          </div>
        </section>

        <section className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThermalLoadTracker />
          <BatteryLifespanGuard />
        </section>

        <section id="reports" className="scroll-mt-24 space-y-5">
          <SectionLabel>Executive Reporting</SectionLabel>
          <ExecutiveReporting />
        </section>
      </div>

      <LogoutOverlay />
    </DashboardShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-mono tracking-[0.28em] uppercase text-zinc-500">{children}</h2>
  );
}
