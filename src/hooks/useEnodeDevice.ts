import { useQuery } from "@tanstack/react-query";
import { enodeClient } from "@/services/enode";

export function enodeDeviceKey(deviceId: string) {
  return ["enode", "device", deviceId] as const;
}

export function useEnodeDevice(deviceId: string | null | undefined) {
  return useQuery({
    queryKey: enodeDeviceKey(deviceId ?? ""),
    queryFn: async () => {
      if (!deviceId) return null;
      const res = await enodeClient.getDevice(deviceId, false);
      return res.device;
    },
    enabled: Boolean(deviceId),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 2,
  });
}
