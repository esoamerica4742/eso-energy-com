/**
 * Derived connection UI state — does not modify WebSocket handlers.
 * Maps TanStack Query fetch state to Live / Reconnecting / Offline for the header indicator.
 */
import { useQueryClient } from "@tanstack/react-query";

export type ConnectionStatus = "live" | "reconnecting" | "offline";

export function useConnectionStatus(): ConnectionStatus {
  const qc = useQueryClient();
  const queries = qc.getQueryCache().getAll();
  const fetching = queries.some((q) => q.state.fetchStatus === "fetching");
  const errored = queries.some(
    (q) => q.state.status === "error" && (q.queryKey[0] === "latest-power-logs" || q.queryKey[0] === "branches"),
  );

  if (errored) return "offline";
  if (fetching) return "reconnecting";
  return "live";
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return "unknown";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}
