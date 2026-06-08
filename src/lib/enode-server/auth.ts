import { createClient } from "@supabase/supabase-js";
import { ensureEnodeEnv } from "@/lib/enode-server/env";

function pickCompanyIdFromUser(user: {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const fromApp = user.app_metadata?.company_id;
  if (typeof fromApp === "string" && fromApp.length > 0) return fromApp;
  const fromUser = user.user_metadata?.company_id;
  if (typeof fromUser === "string" && fromUser.length > 0) return fromUser;
  const fromTenant = user.app_metadata?.tenant_id;
  if (typeof fromTenant === "string" && fromTenant.length > 0) return fromTenant;
  return null;
}

export async function resolveAuthContext(
  req: Request,
): Promise<{ userId: string; companyId: string } | null> {
  ensureEnodeEnv();
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const url = process.env.SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) return null;

  const supabaseAnon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
  if (userError || !userData.user) return null;
  const companyFromClaims = pickCompanyIdFromUser(userData.user);
  if (companyFromClaims) {
    return { userId: userData.user.id, companyId: companyFromClaims };
  }

  if (serviceRole) {
    const supabaseService = createClient(url, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profileService, error: profileServiceError } = await supabaseService
      .from("profiles")
      .select("company_id")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!profileServiceError && profileService?.company_id) {
      return { userId: userData.user.id, companyId: profileService.company_id };
    }
  }

  const { data: profile, error: profileError } = await supabaseAnon
    .from("profiles")
    .select("company_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.company_id) return null;
  return { userId: userData.user.id, companyId: profile.company_id };
}
