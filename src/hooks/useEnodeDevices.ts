import { useQuery } from "@tanstack/react-query";
import { enodeClient } from "@/services/enode";
import { useAuth } from "@/hooks/useAuth";

export const ENODE_DEVICES_KEY = ["enode", "devices"] as const;

export function useEnodeDevices(options?: { syncOnMount?: boolean }) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ENODE_DEVICES_KEY,
    queryFn: async () => {
      const res = await enodeClient.listDevices(options?.syncOnMount ?? false);
      return res.devices;
    },
    enabled: Boolean(session),
    staleTime: 30_000,
    refetchInterval: session ? 30_000 : false,
    retry: 2,
  });
}
