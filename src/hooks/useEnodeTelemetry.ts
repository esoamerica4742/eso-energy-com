import { useQuery } from "@tanstack/react-query";
import { enodeClient } from "@/services/enode";

export function useEnodeTelemetry(deviceId: string | null | undefined, hours = 24) {
  return useQuery({
    queryKey: ["enode", "telemetry", deviceId, hours],
    queryFn: async () => {
      if (!deviceId) return [];
      const res = await enodeClient.getTelemetry(deviceId, hours);
      return res.points;
    },
    enabled: Boolean(deviceId),
    staleTime: 60_000,
  });
}
