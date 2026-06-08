import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { enodeClient } from "@/services/enode";

export const Route = createFileRoute("/link-device/callback")({
  component: LinkDeviceCallbackPage,
});

function LinkDeviceCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        await enodeClient.syncAll();
        if (!cancelled) toast.success("Device linked successfully");
      } catch (err) {
        if (!cancelled) {
          toast.error("Link completed but sync failed", {
            description: err instanceof Error ? err.message : undefined,
          });
        }
      }
      if (!cancelled) {
        navigate({ to: "/monitor" });
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#080A0F] flex flex-col items-center justify-center gap-4 text-zinc-400">
      <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      <p className="text-sm font-mono tracking-wider">Finishing device connection…</p>
    </div>
  );
}
