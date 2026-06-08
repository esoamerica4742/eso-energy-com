/**
 * Enterprise fail-safe for electricity (Monnify bill-pay).
 * Retries gateway timeouts; queues token delivery when DisCo pipes are down.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getUtilityProvider } from "./esopay.ts";
import type { MonnifyPayBillBody } from "./monnify.ts";
import { executeMonnifyBillPipelineForProvider } from "./monnifyBillPipeline.ts";
import {
  deliverPrepaidTokenMultiChannel,
  resolveMeterDisplayName,
} from "./prepaidTokenDelivery.ts";

export {
  backoffMs,
  isDiscoDowntimeError,
  isRetryableGatewayStatus,
  MAX_PAY_ATTEMPTS,
  normalizePayBillError,
  PENDING_FULFILLMENT_STATUS,
  PENDING_FULFILLMENT_USER_MESSAGE,
  UtilityBillPayError,
} from "./utilityBillFulfillmentCore.ts";

import {
  backoffMs,
  isRetryableGatewayStatus,
  MAX_PAY_ATTEMPTS,
  normalizePayBillError,
  PENDING_FULFILLMENT_STATUS,
  UtilityBillPayError,
} from "./utilityBillFulfillmentCore.ts";

export type MonnifyPayBillInput = {
  billerCode: string;
  productCode: string;
  customerId: string;
  amountKobo: number;
  paymentReference: string;
  validationReference?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pay electricity bill with up to 3 attempts; exponential backoff on 504/502/503.
 */
export async function payUtilityBillWithRetry(
  input: MonnifyPayBillInput,
): Promise<MonnifyPayBillBody> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_PAY_ATTEMPTS; attempt++) {
    try {
      return await payBill({
        billerCode: input.billerCode,
        productCode: input.productCode,
        customerId: input.customerId,
        amountKobo: input.amountKobo,
        paymentReference: input.paymentReference,
        validationReference: input.validationReference,
      });
    } catch (err) {
      lastError = err;
      const normalized = normalizePayBillError(err);
      const shouldRetry =
        attempt < MAX_PAY_ATTEMPTS - 1 &&
        (normalized.httpStatus === 504 || isRetryableGatewayStatus(normalized.httpStatus));

      if (!shouldRetry) {
        throw normalized;
      }

      console.warn(
        `[utility-fulfillment] pay retry ${attempt + 1}/${MAX_PAY_ATTEMPTS}`,
        normalized.httpStatus,
        normalized.message,
      );
      await sleep(backoffMs(attempt));
    }
  }

  throw normalizePayBillError(lastError);
}

export async function notifyTokenDelivered(
  supabase: SupabaseClient,
  userId: string,
  input: {
    providerName: string;
    providerId: string;
    accountNumber: string;
    tokenOrReceipt: string | null;
    amountKobo: number;
    paymentReference?: string;
  },
): Promise<void> {
  if (!input.tokenOrReceipt?.trim()) return;

  const meterName = await resolveMeterDisplayName(
    supabase,
    userId,
    input.providerId,
    input.accountNumber,
    input.providerName,
  );

  await deliverPrepaidTokenMultiChannel(supabase, userId, {
    meterName,
    token: input.tokenOrReceipt,
    amountKobo: input.amountKobo,
    accountNumber: input.accountNumber,
    paymentReference: input.paymentReference,
  });
}

type PendingPurchaseRow = {
  id: string;
  user_id: string;
  utility_provider_id: string;
  account_number: string;
  amount_kobo: number;
  monnify_payment_reference: string;
  wallet_transaction_id: string | null;
  fulfillment_attempts: number;
};

export async function processPendingUtilityFulfillment(
  supabase: SupabaseClient,
  options?: { limit?: number },
): Promise<{ scanned: number; fulfilled: number; requeued: number; failed: number }> {
  const limit = options?.limit ?? 25;
  const now = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from("utility_purchases")
    .select(
      "id, user_id, utility_provider_id, account_number, amount_kobo, monnify_payment_reference, wallet_transaction_id, fulfillment_attempts",
    )
    .eq("status", PENDING_FULFILLMENT_STATUS)
    .or(`fulfillment_next_attempt_at.is.null,fulfillment_next_attempt_at.lte.${now}`)
    .order("fulfillment_queued_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  let fulfilled = 0;
  let requeued = 0;
  let failed = 0;

  for (const row of (rows ?? []) as PendingPurchaseRow[]) {
    const provider = await getUtilityProvider(supabase, row.utility_provider_id);
    if (!provider || provider.category !== "electricity") {
      continue;
    }

    const attempts = (row.fulfillment_attempts ?? 0) + 1;

    try {
      const pipeline = await executeMonnifyBillPipelineForProvider(provider, {
        customerId: row.account_number,
        amountKobo: row.amount_kobo,
        paymentReference: row.monnify_payment_reference,
      });
      const result = pipeline.payResult;

      if (result.status === "FAILED") {
        throw new UtilityBillPayError("Monnify returned failure", { discoDowntime: true });
      }

      const txRef = result.transactionReference ?? row.monnify_payment_reference;

      await supabase
        .from("utility_purchases")
        .update({
          status: "success",
          monnify_transaction_reference: txRef,
          token_or_receipt: result.rechargeToken ?? null,
          completed_at: new Date().toISOString(),
          failure_code: null,
          failure_message: null,
          fulfillment_next_attempt_at: null,
        })
        .eq("id", row.id);

      const { refreshMeterAfterPurchase } = await import("./powerShield.ts");
      await refreshMeterAfterPurchase(
        supabase,
        row.user_id,
        row.utility_provider_id,
        row.account_number,
      ).catch((err) => console.warn("[utility-fulfillment] power-shield", err));

      await notifyTokenDelivered(supabase, row.user_id, {
        providerName: provider.name,
        providerId: row.utility_provider_id,
        accountNumber: row.account_number,
        tokenOrReceipt: result.rechargeToken ?? null,
        amountKobo: row.amount_kobo,
        paymentReference: row.monnify_payment_reference,
      });

      fulfilled++;
    } catch (err) {
      const normalized = normalizePayBillError(err);
      if (normalized.discoDowntime && attempts < 48) {
        const nextAt = new Date(Date.now() + Math.min(attempts * 60_000, 15 * 60_000));
        await supabase
          .from("utility_purchases")
          .update({
            fulfillment_attempts: attempts,
            fulfillment_next_attempt_at: nextAt.toISOString(),
            failure_message: normalized.message,
          })
          .eq("id", row.id);
        requeued++;
      } else {
        await supabase
          .from("utility_purchases")
          .update({
            status: "failed",
            failure_code: "FULFILLMENT_EXHAUSTED",
            failure_message: normalized.message,
            completed_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        failed++;
      }
    }
  }

  return {
    scanned: (rows ?? []).length,
    fulfilled,
    requeued,
    failed,
  };
}
