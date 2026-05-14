import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

let active = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function useLogoutActive() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => active,
    () => false,
  );
}

export async function triggerLogout() {
  if (active) return;
  active = true;
  emit();
  // Hold the luxury blackout for exactly 1.5s while we close out the session.
  const [, ] = await Promise.all([
    supabase.auth.signOut(),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  active = false;
  emit();
}
