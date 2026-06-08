/**
 * Supabase Auth Send SMS Hook → Termii (Nigeria).
 * Supabase generates the OTP; this function only delivers the SMS.
 *
 * Secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   TERMII_API_KEY
 *   TERMII_SENDER_ID     — approved alphanumeric sender on Termii
 *   SEND_SMS_HOOK_SECRET — from Auth → Hooks → Send SMS (strip v1,whsec_ prefix)
 */
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const TERMII_SMS_URL = "https://api.ng.termii.com/api/sms/send";

type HookPayload = {
  user: { phone?: string };
  sms: { otp?: string };
};

function termiiDestination(e164Phone: string): string {
  return e164Phone.replace(/\D/g, "");
}

async function sendTermiiSms(to: string, message: string): Promise<Response> {
  const apiKey = Deno.env.get("TERMII_API_KEY")?.trim();
  const senderId = Deno.env.get("TERMII_SENDER_ID")?.trim() ?? "ESOENERGY";

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "TERMII_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch(TERMII_SMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to,
      from: senderId,
      sms: message,
      type: "plain",
      channel: "generic",
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[sms-hook] Termii error:", res.status, text);
    return new Response(JSON.stringify({ error: `Termii HTTP ${res.status}: ${text}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[sms-hook] Termii OK:", text.slice(0, 200));
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const hookSecretRaw = Deno.env.get("SEND_SMS_HOOK_SECRET")?.trim();
  if (!hookSecretRaw) {
    return new Response(JSON.stringify({ error: "SEND_SMS_HOOK_SECRET not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const base64Secret = hookSecretRaw.replace(/^v1,whsec_/, "");
  const payloadText = await req.text();
  const headers = Object.fromEntries(req.headers);

  let verified: HookPayload;
  try {
    const wh = new Webhook(base64Secret);
    verified = wh.verify(payloadText, headers) as HookPayload;
  } catch (err) {
    console.error("[sms-hook] webhook verify failed:", err);
    return new Response(JSON.stringify({ error: "Invalid hook signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const phone = verified.user?.phone?.trim();
  const otp = verified.sms?.otp?.trim();
  if (!phone || !otp) {
    return new Response(JSON.stringify({ error: "Missing phone or otp in hook payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const to = termiiDestination(phone);
  const message = `Your ESO Energy verification code is ${otp}. Do not share this code.`;
  return sendTermiiSms(to, message);
});
