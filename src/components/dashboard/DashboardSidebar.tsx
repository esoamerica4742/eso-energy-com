/**
 * Minimal sidebar navigation — Apple-style icon rail with gold active state.
 */
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Zap,
  Building2,
  Fuel,
  BarChart3,
  Bell,
  Plug,
  Shield,
  Settings,
  ChevronLeft,
  Sun,
} from "lucide-react";
import { EsoLogo } from "@/components/aura/EsoLogo";

const NAV: Array<{
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  hash?: string;
}> = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard", label: "Energy", icon: Zap, hash: "energy" },
  { to: "/dashboard", label: "Fleet Sites", icon: Building2, hash: "fleet" },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/link-device", label: "Connect device", icon: Plug },
  { to: "/dashboard", label: "Diesel Audit", icon: Fuel, hash: "diesel" },
  { to: "/dashboard", label: "Reports", icon: BarChart3, hash: "reports" },
  { to: "/dashboard", label: "Security", icon: Shield, hash: "security" },
  { to: "/dashboard", label: "Settings", icon: Settings, hash: "settings" },
];

type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

export function DashboardSidebar({ collapsed, onToggle }: Props) {
  return (
    <aside
      className={`relative z-20 flex flex-col border-r border-white/[0.06] bg-[#0D0D0C]/95 backdrop-blur-xl transition-[width] duration-300 ease-out ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      <div className={`flex items-center h-16 px-4 ${collapsed ? "justify-center" : "gap-3"}`}>
        <EsoLogo size="sm" showDot={!collapsed} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[10px] font-mono tracking-[0.28em] text-[#D4AF37] uppercase font-semibold truncate">
              ESO Energy
            </p>
            <p className="text-[9px] text-zinc-500 font-mono tracking-wider">Dashboard</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5" aria-label="Main">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to}
              {...(item.hash ? { hash: item.hash } : {})}
              activeOptions={{ exact: item.end }}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                collapsed ? "justify-center px-2" : ""
              }`}
              activeProps={{
                className:
                  "bg-[#D4AF37]/12 text-[#E8D5A3] shadow-[inset_0_0_0_1px_rgba(212,175,55,0.25)]",
              }}
              inactiveProps={{
                className: "text-zinc-400 hover:text-white hover:bg-white/[0.04]",
              }}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-90 group-[.active]:text-[#D4AF37]" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mx-3 mb-4 rounded-xl border border-white/[0.06] bg-black/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Live Generation
            </span>
          </div>
          <p className="text-xl font-semibold text-white tabular-nums tracking-tight">
            2.4 <span className="text-sm font-normal text-zinc-500">MW</span>
          </p>
          <p className="text-[10px] text-emerald-400/90 font-mono mt-1">↑ 12% vs yesterday</p>
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-white/10 bg-[#1a1a18] flex items-center justify-center text-zinc-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-colors shadow-lg"
      >
        <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
      </button>
    </aside>
  );
}
