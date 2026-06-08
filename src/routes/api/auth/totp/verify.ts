/**
 * POST /api/auth/totp/verify — confirm TOTP code (setup or login step-up).
 */
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { z } from "zod";
import { confirmTotpSetup, verifyTotpCode, verifyBackupCode } from "@/lib/auth/totp";
import { writeAuditLog } from "@/lib/audit";

const bodySchema = z
  .object({
    token: z.string().length(6).regex(/^\d+$/).optional(),
    backupCode: z.string().min(8).max(32).optional(),
    mode: z.enum(["setup", "login"]).default("login"),
  })
  .strict()
  .refine((d) => d.token || d.backupCode, { message: "token or backupCode required" });

export const APIRoute = createAPIFileRoute("/api/auth/totp/verify")({
  POST: async ({ request }) => {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await request.json());
    } catch {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }

    const userId = await resolveUserId(request);
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let valid = false;
    if (body.backupCode) {
      valid = await verifyBackupCode(userId, body.backupCode);
    } else if (body.token) {
      valid =
        body.mode === "setup"
          ? await confirmTotpSetup(userId, body.token)
          : await verifyTotpCode(userId, body.token);
    }

    await writeAuditLog({
      userId,
      action: valid ? "TOTP_VERIFY_SUCCESS" : "TOTP_VERIFY_FAILURE",
      resource: `user:${userId}`,
      request,
      success: valid,
    });

    if (!valid) {
      return Response.json({ error: "Invalid code" }, { status: 401 });
    }

    return Response.json({ ok: true, totpVerified: true });
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
