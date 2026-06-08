/**
 * Top command bar — site selector, mesh status, session controls.
 */
import { Menu, Bell, Search, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { triggerLogout, useLogoutActive } from "@/lib/logout-bus";
import { LiveIndicator } from "@/components/aura/LiveIndicator";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";

const AFRICA_HUBS = ["All sites", "Lagos Hub", "Abuja DC", "Nairobi Edge", "Accra Branch"];

type Props = {
  collapsed: boolean;
  onMenuToggle: () => void;
};

export function DashboardTopBar({ onMenuToggle }: Props) {
  const loggingOut = useLogoutActive();
  const connectionStatus = useConnectionStatus();
  const lagosTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-4 px-4 sm:px-6 border-b border-white/[0.06] bg-[#0D0D0C]/80 backdrop-blur-xl">
      <button
        type="button"
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
        <Search className="h-4 w-4 text-zinc-500 shrink-0" />
        <input
          type="search"
          placeholder="Search sites, branches, alerts…"
          className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 tracking-wider">
          <MapPin className="h-3 w-3 text-[#D4AF37]" />
          WAT {lagosTime}
        </div>

        <select
          className="appearance-none rounded-full border border-white/[0.08] bg-black/40 pl-3 pr-8 py-1.5 text-[11px] font-mono text-zinc-300 focus:outline-none focus:border-[#D4AF37]/40 cursor-pointer"
          defaultValue={AFRICA_HUBS[0]}
          aria-label="Select site"
        >
          {AFRICA_HUBS.map((hub) => (
            <option key={hub} value={hub} className="bg-[#121211]">
              {hub}
            </option>
          ))}
        </select>

        <div className="hidden sm:block">
          <LiveIndicator status={connectionStatus} />
        </div>

        <Link
          to="/alerts"
          className="relative p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#D4AF37] ring-2 ring-[#0D0D0C]" />
        </Link>

        <Link
          to="/login"
          className="hidden sm:inline text-[10px] font-mono tracking-wider text-zinc-500 hover:text-[#D4AF37] px-2"
        >
          Account
        </Link>

        <button
          type="button"
          onClick={() => triggerLogout()}
          disabled={loggingOut}
          className="rounded-full px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/15 transition-colors disabled:opacity-60"
        >
          {loggingOut ? "Exit…" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
