/**
 * Command Deck shell — Apple-minimal dark layout with gold accents.
 * WHY: Consistent B2B frame for all monitoring modules across African sites.
 */
import { useState } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";

type DashboardShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export function DashboardShell({ children, title, subtitle }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A09] text-[#E8E6E1] flex overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 100% 0%, rgba(212,175,55,0.06), transparent 55%), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(16,185,129,0.04), transparent 50%)",
        }}
      />

      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="relative z-10 flex flex-1 flex-col min-w-0">
        <DashboardTopBar
          collapsed={sidebarCollapsed}
          onMenuToggle={() => setSidebarCollapsed((c) => !c)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {(title || subtitle) && (
              <header className="mb-8">
                {subtitle && (
                  <p className="text-[10px] font-mono tracking-[0.35em] uppercase text-[#D4AF37]/80 mb-2">
                    {subtitle}
                  </p>
                )}
                {title && (
                  <h1
                    className="text-[1.75rem] sm:text-[2rem] font-medium tracking-tight text-white"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {title}
                  </h1>
                )}
              </header>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
