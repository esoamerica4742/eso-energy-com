import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const COMPANY_ID_KEY = ["profile", "company_id"] as const;

export function useCompanyId() {
  const { session } = useAuth();

  return useQuery({
    queryKey: COMPANY_ID_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .maybeSingle();
      if (error) throw error;
      return data?.company_id ?? null;
    },
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
  });
}
