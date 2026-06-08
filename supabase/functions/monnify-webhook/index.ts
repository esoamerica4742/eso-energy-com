/**
 * Monnify webhook — credits individual Eso Pay wallets on reserved-account deposits.
 */
import { jsonResponse, optionsResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/esopay.ts";
import { isValidMonnifyWebhook } from "../_shared/monnify.ts";

type MonnifyWebhookPayload = {
  eventType?: string;
  eventData?: {
    product?: { type?: string; reference?: string };
    transactionReference?: string;
    paymentReference?: string;
    amountPaid?: number;
    paidOn?: string;
    paymentStatus?: string;
    destinationAccountInformation?: {
      accountNumber?: string;
      bankCode?: string;
      bankName?: string;
    };
    customer?: { email?: string; name?: string };
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const rawBody = await req.text();
  const signature = req.headers.get("monnify-signature") ??
    req.headers.get("MNFY-SIGNATURE");

  const valid = await isValidMonnifyWebhook(rawBody, signature);
  if (!valid) {
    console.warn("[monnify-webhook] invalid signature");
    return jsonResponse({ error: "Invalid signature" }, 401);
  }

  let payload: MonnifyWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MonnifyWebhookPayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const supabase = createServiceClient();
  const eventType = (payload.eventType ?? "").toUpperCase();
  const data = payload.eventData;

  const isPaid =
    eventType.includes("SUCCESS") ||
    data?.paymentStatus === "PAID";

  if (!data || !isPaid) {
    return jsonResponse({ ok: true, ignored: true });
  }

  const accountReference = data.product?.reference ?? data.paymentReference;
  const txRef = data.transactionReference;
  const amountPaid = Number(data.amountPaid ?? 0);
  const amountKobo = Math.round(amountPaid * 100);

  if (!accountReference || !txRef || amountKobo <= 0) {
    return jsonResponse({ ok: true, skipped: "missing fields" });
  }

  const { data: wallet, error: walletError } = await supabase
    .from("company_wallets")
    .select("user_id, company_id")
    .eq("monnify_account_reference", accountReference)
    .maybeSingle();

  const walletRow = wallet ?? (await supabase
    .from("company_wallets")
    .select("user_id, company_id")
    .eq("monnify_wallet_reference", accountReference)
    .maybeSingle()).data;

  if (walletError || !walletRow) {
    console.warn("[monnify-webhook] wallet not found for", accountReference);
    return jsonResponse({ ok: true, skipped: "unknown account" });
  }

  const walletScopeId = walletRow.user_id ?? walletRow.company_id;
  if (!walletScopeId) {
    return jsonResponse({ ok: true, skipped: "wallet has no owner" });
  }

  const { error: creditError } = await supabase.rpc("esopay_credit_wallet", {
    p_company_id: walletScopeId,
    p_amount_kobo: amountKobo,
    p_monnify_tx_ref: txRef,
    p_monnify_payment_ref: data.paymentReference ?? null,
    p_narration: "Wallet funding via bank transfer",
    p_metadata: { event_type: eventType, paid_on: data.paidOn },
  });

  if (creditError) {
    console.error("[monnify-webhook] credit failed", creditError);
    return jsonResponse({ error: creditError.message }, 500);
  }

  const intentFilter = walletRow.user_id
    ? { column: "user_id", value: walletRow.user_id }
    : { column: "company_id", value: walletRow.company_id };

  await supabase
    .from("eso_pay_funding_intents")
    .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
    .eq(intentFilter.column, intentFilter.value)
    .eq("status", "pending")
    .lte("amount_kobo", amountKobo);

  return jsonResponse({ ok: true });
});
