/**
 * POST /api/auth/totp/setup — begin 2FA setup (server-only encryption).
 * WHY: TOTP secret encrypted before any DB write; returned once for QR display.
 */
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { z } from "zod";
import { beginTotpSetup } from "@/lib/auth/totp";
import { writeAuditLog } from "@/lib/audit";

const bodySchema = z.object({}).strict();

export const APIRoute = createAPIFileRoute("/api/auth/totp/setup")({
  POST: async ({ request }) => {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await bodySchema.parseAsync(await request.json().catch(() => ({})));
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const userId = await resolveUserId(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const result = await beginTotpSetup(userId);
      await writeAuditLog({
        userId,
        action: "TOTP_SETUP_STARTED",
        resource: `user:${userId}`,
        request,
        success: true,
      });
      return Response.json({
        otpauthUrl: result.otpauthUrl,
        secret: result.secret,
        backupCodes: result.backupCodes,
      });
    } catch (err) {
      await writeAuditLog({
        userId,
        action: "TOTP_SETUP_STARTED",
        resource: `user:${userId}`,
        request,
        success: false,
        metadata: { error: err instanceof Error ? err.message : "unknown" },
      });
      return Response.json({ error: "Setup failed" }, { status: 500 });
    }
  },
});

async function resolveUserId(request: Request): Promise<string | null> {
  const { createClient } = await import("@supabase/supabase-js");
  const token = request.headers.get("authorization")!.replace("Bearer ", "");
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
}
