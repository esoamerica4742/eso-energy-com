import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Add your site", "Connect your inverter", "Go live instantly"] as const;

type Props = {
  linking?: boolean;
  onAddSite: () => void;
};

function InverterGlyph() {
  return (
    <svg width="120" height="120" viewBox="0 0 160 160" aria-hidden className="mx-auto">
      <rect
        x="28"
        y="28"
        width="104"
        height="104"
        rx="18"
        fill="rgba(212,175,55,0.05)"
        stroke="rgba(212,175,55,0.18)"
      />
      <rect
        x="46"
        y="58"
        width="68"
        height="44"
        rx="10"
        fill="#141A28"
        stroke="rgba(212,175,55,0.35)"
        strokeWidth="1.2"
      />
      <rect x="54" y="66" width="52" height="16" rx="4" fill="rgba(212,175,55,0.35)" />
      <circle cx="58" cy="74" r="2.2" fill="#D4AF37" />
      <circle cx="66" cy="74" r="2.2" fill="rgba(255,255,255,0.2)" />
      <circle cx="74" cy="74" r="2.2" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}

export function MonitorEmptyState({ linking = false, onAddSite }: Props) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-[24px] border border-white/[0.08] bg-[#0B1018]/90 p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <InverterGlyph />
      <h2 className="mt-4 text-xl font-bold text-white">No Sites Yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-zinc-500">
        Add your first site to start monitoring energy, savings, and grid intelligence.
      </p>

      <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left">
        {STEPS.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] px-4 py-2.5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[11px] font-bold text-[#09090B]">
              {index + 1}
            </span>
            <span className="text-[14px] font-medium text-zinc-200">{step}</span>
          </li>
        ))}
      </ol>

      <button
        type="button"
        disabled={linking}
        onClick={onAddSite}
        className={cn(
          "mt-8 inline-flex min-h-[48px] min-w-[240px] items-center justify-center rounded-full px-8",
          "bg-gradient-to-br from-[#F8D56A] via-[#D4AF37] to-[#A68B2E]",
          "text-[15px] font-bold text-[#09090B] shadow-[0_8px_32px_rgba(212,175,55,0.25)]",
          "transition-transform hover:scale-[1.02] active:scale-[0.98]",
          "disabled:cursor-not-allowed disabled:opacity-70",
        )}
      >
        {linking ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#09090B]" />
            Connecting…
          </>
        ) : (
          "Add Your First Site"
        )}
      </button>
    </div>
  );
}
