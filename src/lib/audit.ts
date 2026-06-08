/**
 * Immutable audit trail for security-critical actions.
 * WHY: Compliance (SOC 2, NDPR, POPIA) requires provable who-did-what-when.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
// NOTE: Supabase generated types are currently incomplete for security tables.
// We intentionally use a loose DB handle here until types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "TOTP_SETUP_STARTED"
  | "TOTP_VERIFY_SUCCESS"
  | "TOTP_VERIFY_FAILURE"
  | "TOTP_ENABLED"
  | "SESSION_REVOKED"
  | "API_KEY_CREATED"
  | "API_KEY_REVOKED"
  | "PASSKEY_REGISTERED"
  | "PASSKEY_REMOVED"
  | "ROLE_CHANGED"
  | "DATA_EXPORT"
  | "AUTHORIZATION_DENIED"
  | "ACCOUNT_LOCKED";

type AuditParams = {
  userId?: string;
  orgId?: string;
  action: AuditAction;
  resource?: string;
  request: Request;
  success: boolean;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(params: AuditParams): Promise<void> {
  const ip =
    params.request.headers.get("cf-connecting-ip") ??
    params.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const userAgent = params.request.headers.get("user-agent") ?? "unknown";
  const country = params.request.headers.get("cf-ipcountry") ?? undefined;

  const { error } = await db.from("audit_logs").insert({
    user_id: params.userId ?? null,
    org_id: params.orgId ?? null,
    action: params.action,
    resource: params.resource ?? null,
    ip_address: ip,
    user_agent: userAgent,
    country: country ?? null,
    success: params.success,
    metadata: params.metadata ?? null,
  });

  if (error) {
    console.error("[Audit] Failed to write log:", error.message);
  }
}
