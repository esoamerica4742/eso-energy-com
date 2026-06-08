import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link2, Shield, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useEnodeLink } from "@/hooks/useEnodeLink";
import { useEnodeDevices } from "@/hooks/useEnodeDevices";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/link-device")({
  component: LinkDevicePage,
});

const STEPS = [
  { icon: Shield, text: "Authorize with your inverter or charger vendor" },
  { icon: Link2, text: "Enode links the device to your company account" },
  { icon: Zap, text: "Live power data appears on your dashboard" },
];

function LinkDevicePage() {
  const { session, loading } = useAuth();
  const link = useEnodeLink();
  const { data: devices = [], refetch } = useEnodeDevices();
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    if (devices.length > 0) setLinked(true);
  }, [devices.length]);

  if (!loading && !session) {
    return (
      <DashboardShell title="Connect device" subtitle="Sign in required">
        <p className="text-zinc-400 mb-4">You need to sign in before connecting Enode devices.</p>
        <Link to="/login" className="text-[#D4AF37] hover:underline font-mono text-sm">
          Go to sign in →
        </Link>
      </DashboardShell>
    );
  }

  const startLink = () => {
    link.mutate(undefined, {
      onError: () => {},
    });
  };

  return (
    <DashboardShell title="Connect device" subtitle="Powered by Enode">
      <div className="max-w-lg space-y-8">
        <div className="flex items-center gap-4">
          <span className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-xl font-bold text-[#D4AF37]">
            E
          </span>
          <div>
            <p className="font-semibold text-white">ESO Energy</p>
            <p className="text-[12px] text-zinc-500">Secure device linking</p>
          </div>
        </div>

        <p className="text-zinc-400 text-[15px] leading-relaxed">
          Link solar inverters and EV chargers. Vendor credentials are handled by Enode —
          never stored on ESO servers.
        </p>

        <ul className="space-y-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="h-8 w-8 rounded-md bg-blue-500/10 grid place-items-center shrink-0">
                  <Icon className="h-4 w-4 text-blue-400" />
                </span>
                {step.text}
              </li>
            );
          })}
        </ul>

        {linked ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {devices.length} device{devices.length === 1 ? "" : "s"} connected
          </div>
        ) : null}

        <button
          type="button"
          onClick={startLink}
          disabled={link.isPending}
          className="w-full rounded-lg bg-[#D4AF37] text-[#0A0A09] font-semibold py-3.5 hover:bg-[#E8D5A3] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {link.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Opening Enode…
            </>
          ) : (
            linked ? "Connect another device" : "Connect with Enode"
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            void refetch();
            toast.message("Refreshed device list");
          }}
          className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300"
        >
          Refresh device list
        </button>

        <Link to="/dashboard" className="block text-[11px] font-mono text-zinc-500 hover:text-[#D4AF37]">
          ← Back to dashboard
        </Link>
      </div>
    </DashboardShell>
  );
}
