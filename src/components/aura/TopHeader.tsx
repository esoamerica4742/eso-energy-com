import { ChevronDown, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.92 0.02 255)" />
          <stop offset="100%" stopColor="oklch(0.62 0.04 255)" />
        </linearGradient>
      </defs>
      <path d="M16 3 L28 27 H22 L16 14 L10 27 H4 Z" fill="url(#lg)" />
      <circle cx="16" cy="22" r="2.4" fill="oklch(0.78 0.17 75)" style={{ filter: "drop-shadow(0 0 4px oklch(0.78 0.17 75))" }} />
    </svg>
  );
}

export function TopHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl"
      style={{
        background: "linear-gradient(180deg, oklch(0.13 0.02 265 / 0.85), oklch(0.13 0.02 265 / 0.55))",
        borderBottom: "1px solid oklch(0.30 0.03 265 / 0.6)",
      }}>
      <div className="mx-auto max-w-[1440px] px-5 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="flex items-baseline gap-3">
            <span className="text-[15px] font-semibold tracking-[0.18em] text-silver">AURA</span>
            <span className="text-[11px] tracking-[0.32em] text-silver/70 hidden sm:inline">ENTERPRISE</span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 ml-3 rounded-full hairline px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase"
            style={{
              color: "oklch(0.85 0.16 75)",
              background: "oklch(0.30 0.10 75 / 0.15)",
              boxShadow: "inset 0 0 0 1px oklch(0.78 0.17 75 / 0.3)",
            }}>
            ◆ Sovereign Fleet Tier
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[11px] text-silver">
            <span className="font-mono">SESSION · AES-256</span>
          </div>
          <button className="group flex items-center gap-3 rounded-full hairline pl-1.5 pr-3 py-1.5 transition-all hover:bg-[oklch(0.22_0.025_265)]"
            style={{ background: "oklch(0.18 0.022 265)" }}>
            <span className="relative h-8 w-8 rounded-full grid place-items-center text-[11px] font-semibold"
              style={{ background: "linear-gradient(135deg, oklch(0.32 0.04 265), oklch(0.20 0.025 265))", color: "oklch(0.92 0.01 250)" }}>
              AB
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[oklch(0.16_0.02_265)] bg-[oklch(0.74_0.17_165)]" />
            </span>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-[12px] font-medium text-foreground/95">Access Bank</p>
              <p className="text-[10px] tracking-wider text-silver">Group Head · Facilities</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-silver" />
          </button>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            aria-label="Sign out"
            className="hairline rounded-full p-2 text-silver hover:text-[oklch(0.85_0.18_25)] hover:bg-[oklch(0.66_0.24_25_/_0.1)] transition-colors"
            style={{ background: "oklch(0.18 0.022 265)" }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
