import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "monitor", label: "MONITOR", href: "/monitor" },
  { id: "sites", label: "SITES", href: "/dashboard" },
  { id: "reports", label: "REPORTS", href: "/dashboard" },
  { id: "alerts", label: "ALERTS", href: "/alerts" },
  { id: "settings", label: "SETTINGS", href: "/dashboard" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MonitorTabBar({ active }: { active: TabId }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-[#0D1017]/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id} className="flex-1">
              <Link
                to={tab.href}
                className={cn(
                  "flex min-h-[44px] flex-col items-center justify-center rounded-xl px-1 text-[9px] font-bold tracking-[0.12em] transition-colors",
                  isActive
                    ? "bg-[#D4AF37]/15 text-[#F5C842]"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
