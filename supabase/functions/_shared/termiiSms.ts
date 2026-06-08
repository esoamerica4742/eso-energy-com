/**
 * Termii SMS delivery (Nigeria) — shared by Auth SMS hook and Power Shield alerts.
 */

const TERMII_SMS_URL = "https://api.ng.termii.com/api/sms/send";

function termiiDestination(e164Phone: string): string {
  return e164Phone.replace(/^\+/, "");
}

export async function sendTermiiSms(toE164: string, message: string): Promise<boolean> {
  const apiKey = Deno.env.get("TERMII_API_KEY")?.trim();
  const senderId = Deno.env.get("TERMII_SENDER_ID")?.trim() ?? "ESOENERGY";

  if (!apiKey || !toE164?.trim()) {
    console.warn("[termii] missing API key or destination");
    return false;
  }

  const res = await fetch(TERMII_SMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      to: termiiDestination(toE164),
      from: senderId,
      sms: message,
      type: "plain",
      channel: "generic",
    }),
  });

  if (!res.ok) {
    console.error("[termii] HTTP", res.status, await res.text());
    return false;
  }

  return true;
}
