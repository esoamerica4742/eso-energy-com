import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { enodeClient } from "@/services/enode";
import { ENODE_DEVICES_KEY } from "@/hooks/useEnodeDevices";

const POPUP_FEATURES = "width=480,height=760,scrollbars=yes,resizable=yes";

function waitForPopupClose(popup: Window): Promise<"closed" | "blocked"> {
  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        resolve("closed");
      }
    }, 400);
  });
}

/**
 * Opens Enode Connect in a centered overlay (popup) on top of the dashboard.
 * The vendor OAuth UI runs at linkUrl; completion returns via /link-device/callback.
 */
export function useEnodeLinkOverlay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const session = await enodeClient.createLinkSession("inverter");
      if (typeof window === "undefined") {
        throw new Error("Enode link is only available in the browser");
      }

      const popup = window.open(session.linkUrl, "enode-connect", POPUP_FEATURES);
      if (!popup) {
        window.location.href = session.linkUrl;
        return { status: "redirect" as const };
      }

      popup.focus();
      await waitForPopupClose(popup);
      await enodeClient.syncAll();
      return { status: "closed" as const };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ENODE_DEVICES_KEY });
      toast.success("Checking for linked devices…");
    },
    onError: (err) => {
      toast.error("Enode link failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    },
  });
}
