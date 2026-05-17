import { ChevronDown, LogIn, LogOut, UserPlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { triggerLogout, useLogoutActive } from "@/lib/logout-bus";
import { EsoLogo } from "@/components/aura/EsoLogo";

export function TopHeader() {
  const loggingOut = useLogoutActive();
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl"
      style={{
        background: "linear-gradient(180deg, oklch(0.13 0.003 265 / 0.85), oklch(0.13 0.003 265 / 0.55))",
        borderBottom: "1px solid oklch(1 0 0 / 0.06)",
      }}>
      <div className="mx-auto max-w-[1440px] px-5 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <EsoLogo size="md" />
          <span className="hidden md:inline-flex items-center gap-1.5 ml-3 rounded-full hairline px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase"
            style={{
              color: "oklch(0.85 0.13 86)",
              background: "oklch(0.78 0.13 86 / 0.15)",
              boxShadow: "inset 0 0 0 1px oklch(0.78 0.13 86 / 0.4)",
            }}>
            ◆ Sovereign Fleet Tier
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[11px] text-silver">
            <span className="font-mono">SESSION · AES-256</span>
          </div>
          <button className="group flex items-center gap-3 rounded-full hairline pl-1.5 pr-3 py-1.5 transition-all hover:bg-[oklch(0.22_0.008_265)]"
            style={{ background: "oklch(0.19 0.006 265)" }}>
            <span className="relative h-8 w-8 rounded-full grid place-items-center text-[11px] font-semibold"
              style={{ background: "linear-gradient(135deg, oklch(0.78 0.13 86), oklch(0.89 0.07 88))", color: "oklch(0.13 0.003 265)" }}>
              AB
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[oklch(0.13_0.003_265)] bg-[oklch(0.74_0.17_165)]" />
            </span>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-[12px] font-medium text-foreground/95">Access Bank</p>
              <p className="text-[10px] tracking-wider text-silver">Group Head · Facilities</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-silver" />
          </button>
          <button
            type="button"
            onClick={() => triggerLogout()}
            disabled={loggingOut}
            aria-label="Sign out"
            className="hairline rounded-full px-3 py-2 inline-flex items-center gap-2 text-silver hover:text-[oklch(0.85_0.18_25)] hover:bg-[oklch(0.66_0.24_25_/_0.1)] transition-colors disabled:opacity-90"
            style={{ background: "oklch(0.19 0.006 265)" }}
          >
            <LogOut className="h-3.5 w-3.5" />
            {loggingOut && (
              <span className="text-[10px] font-mono tracking-[0.28em] uppercase text-[oklch(0.85_0.18_25)]">
                De-initializing…
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
