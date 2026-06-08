import { createFileRoute, Link } from "@tanstack/react-router";
import { Smartphone } from "lucide-react";
import { EsoLogo } from "@/components/aura/EsoLogo";

export const Route = createFileRoute("/esopay/open")({
  component: EsoPayOpenPage,
  head: () => ({
    meta: [{ title: "Open Eso Pay · ESO Energy" }],
  }),
});

function EsoPayOpenPage() {
  return (
    <div className="deck-canvas flex min-h-screen items-center justify-center px-5 py-10">
      <div className="deck-card max-w-md px-8 py-10 text-center">
        <EsoLogo size="md" variant="display" className="mx-auto" />
        <div
          className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "rgba(212, 175, 55, 0.12)" }}
        >
          <Smartphone className="h-7 w-7 text-[#D4AF37]" strokeWidth={2} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-white">You&apos;re signed in</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          Eso Pay Bills runs in the <strong className="text-white/80">ESO Energy mobile app</strong>.
          Open the app on your phone to use your wallet, pay utilities, and manage bills.
        </p>
        <p className="mt-4 font-mono text-[11px] text-[#D4AF37]/90">
          Expo Go / ESO Energy app → Eso Pay Bills tab
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/access"
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/80 hover:border-white/20"
          >
            ← Back to command center
          </Link>
          <Link
            to="/dashboard"
            className="rounded-xl px-4 py-3 text-sm font-medium text-[#080C0C]"
            style={{ backgroundColor: "#00E5C0" }}
          >
            Open monitoring dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
