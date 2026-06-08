/**
 * Eso Pay Bills — low-balance / low-token threshold monitor + outbound webhooks.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
async function computeEsoPayWebhookSignature(payload: string): Promise<string> {
  const secret = Deno.env.get("ESO_PAY_LOW_TOKEN_WEBHOOK_SECRET")?.trim() ?? "";
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
import {
  evaluatePowerShieldAlerts,
  type PrepaidMeterRow,
  type UtilityProviderMini,
} from "./powerShield.ts";
import type { PowerShieldAlertTier } from "./powerShieldEngine.ts";
import {
  aggregateFacilityDailySpendKobo,
  buildThresholdFingerprint,
  evaluateTokenReserveThreshold,
  evaluateWalletBalanceThreshold,
  type ThresholdChannel,
  type WalletThresholdEvaluation,
} from "./walletThresholdEngine.ts";

export type LowTokenWebhookPayload = {
  event: "eso_pay.low_token_warning";
  version: 1;
  user_id: string;
  channel: ThresholdChannel;
  tier: PowerShieldAlertTier;
  capacity_remaining_pct: number | null;
  volume_remaining_pct?: number | null;
  shield_context_text?: string | null;
  remaining_kwh?: number | null;
  batch_total_kwh?: number | null;
  daily_spend_kobo: number;
  remaining_kobo: number | null;
  wallet_balance_kobo?: number;
  reserve_target_kobo?: number;
  meter_id?: string;
  meter_label?: string;
  account_number?: string;
  provider_name?: string;
  triggered_at: string;
};

function tierFromLevel(
  level: WalletThresholdEvaluation["level"],
): PowerShieldAlertTier | null {
  if (level === "critical") return "critical";
  if (level === "warn_10") return "warn_10";
  return null;
}

export async function dispatchLowTokenWarningWebhook(
  payload: LowTokenWebhookPayload,
): Promise<boolean> {
  const url = Deno.env.get("ESO_PAY_LOW_TOKEN_WEBHOOK_URL")?.trim();
  if (!url) return false;

  const body = JSON.stringify(payload);
  const secret = Deno.env.get("ESO_PAY_LOW_TOKEN_WEBHOOK_SECRET")?.trim() ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Eso-Pay-Event": payload.event,
  };

  if (secret) {
    headers["X-Eso-Pay-Signature"] = await computeEsoPayWebhookSignature(body);
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("[wallet-threshold] webhook failed", res.status, text.slice(0, 200));
    return false;
  }

  return true;
}

async function recordWebhookDelivery(
  supabase: SupabaseClient,
  payload: LowTokenWebhookPayload,
  fingerprint: string,
): Promise<boolean> {
  const { error } = await supabase.from("eso_pay_low_token_webhook_deliveries").insert({
    user_id: payload.user_id,
    meter_id: payload.meter_id ?? null,
    channel: payload.channel,
    tier: payload.tier,
    fingerprint,
    payload,
  });

  if (error?.message?.includes("duplicate")) return false;
  if (error) {
    console.warn("[wallet-threshold] delivery insert", error.message);
    return false;
  }
  return true;
}

export async function notifyLowTokenThreshold(
  supabase: SupabaseClient,
  payload: LowTokenWebhookPayload,
  cycleKey: string,
): Promise<boolean> {
  const fingerprint = buildThresholdFingerprint({
    userId: payload.user_id,
    channel: payload.channel,
    tier: payload.tier,
    meterId: payload.meter_id,
    cycleKey,
  });

  const inserted = await recordWebhookDelivery(supabase, payload, fingerprint);
  if (!inserted) return false;

  return dispatchLowTokenWarningWebhook(payload);
}

type PurchaseRow = {
  amount_kobo: number;
  completed_at: string | null;
  created_at: string;
  token_or_receipt?: string | null;
};

async function fetchPurchasesForMeter(
  supabase: SupabaseClient,
  userId: string,
  accountNumber: string,
  providerId: string,
): Promise<PurchaseRow[]> {
  const { data } = await supabase
    .from("utility_purchases")
    .select("amount_kobo, completed_at, created_at, token_or_receipt")
    .eq("user_id", userId)
    .eq("account_number", accountNumber)
    .eq("utility_provider_id", providerId)
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(12);

  return (data ?? []) as PurchaseRow[];
}

export async function evaluateWalletBalanceThresholds(
  supabase: SupabaseClient,
  options?: { userId?: string },
): Promise<{ evaluated: number; webhooks: number }> {
  let walletQuery = supabase
    .from("company_wallets")
    .select("user_id, balance_kobo")
    .not("user_id", "is", null);

  if (options?.userId) walletQuery = walletQuery.eq("user_id", options.userId);

  const { data: wallets, error: walletError } = await walletQuery;
  if (walletError) throw new Error(walletError.message);

  let webhooks = 0;
  const monthCycle = new Date().toISOString().slice(0, 7);

  for (const wallet of wallets ?? []) {
    const userId = wallet.user_id as string;
    if (!userId) continue;

    let meterQuery = supabase
      .from("prepaid_electricity_meters")
      .select("*")
      .eq("user_id", userId);

    const { data: meters } = await meterQuery;
    const meterRows = (meters ?? []) as PrepaidMeterRow[];

    const purchasesByMeter: PurchaseRow[][] = [];
    for (const meter of meterRows) {
      purchasesByMeter.push(
        await fetchPurchasesForMeter(
          supabase,
          userId,
          meter.account_number,
          meter.utility_provider_id,
        ),
      );
    }

    const facilityDaily = aggregateFacilityDailySpendKobo(meterRows, purchasesByMeter);
    if (facilityDaily <= 0) continue;

    const evaluation = evaluateWalletBalanceThreshold(
      wallet.balance_kobo as number,
      facilityDaily,
    );
    const tier = tierFromLevel(evaluation.level);
    if (!tier) continue;

    const sent = await notifyLowTokenThreshold(
      supabase,
      {
        event: "eso_pay.low_token_warning",
        version: 1,
        user_id: userId,
        channel: "wallet",
        tier,
        capacity_remaining_pct: evaluation.capacityPct,
        daily_spend_kobo: evaluation.dailySpendKobo,
        remaining_kobo: evaluation.remainingKobo,
        wallet_balance_kobo: evaluation.walletBalanceKobo,
        reserve_target_kobo: evaluation.reserveTargetKobo,
        triggered_at: new Date().toISOString(),
      },
      `wallet:${monthCycle}`,
    );

    if (sent) webhooks++;
  }

  return { evaluated: (wallets ?? []).length, webhooks };
}

export async function evaluateTokenReserveThresholdWebhooks(
  supabase: SupabaseClient,
  options?: { userId?: string },
): Promise<{ evaluated: number; webhooks: number }> {
  let query = supabase
    .from("prepaid_electricity_meters")
    .select("*")
    .not("last_purchase_at", "is", null);

  if (options?.userId) query = query.eq("user_id", options.userId);

  const { data: meters, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (meters ?? []) as PrepaidMeterRow[];
  const providerIds = [...new Set(rows.map((m) => m.utility_provider_id))];
  const { data: providers } = await supabase
    .from("utility_providers")
    .select("id, name, category, monnify_biller_code, monnify_product_code")
    .in("id", providerIds);

  const providerMap = new Map(
    (providers ?? []).map((p) => [p.id, p as UtilityProviderMini]),
  );

  let webhooks = 0;

  for (const meter of rows) {
    const purchases = await fetchPurchasesForMeter(
      supabase,
      meter.user_id,
      meter.account_number,
      meter.utility_provider_id,
    );
    const evaluation = evaluateTokenReserveThreshold(meter, purchases);
    if (!evaluation.tier) continue;

    const provider = providerMap.get(meter.utility_provider_id);
    const cycleKey = meter.last_purchase_at ?? meter.id;

    const sent = await notifyLowTokenThreshold(
      supabase,
      {
        event: "eso_pay.low_token_warning",
        version: 1,
        user_id: meter.user_id,
        channel: "token_reserve",
        tier: evaluation.tier,
        capacity_remaining_pct: evaluation.capacityPct,
        volume_remaining_pct: evaluation.volumePct,
        shield_context_text: evaluation.shieldContextText,
        remaining_kwh: evaluation.remainingKwh,
        batch_total_kwh: evaluation.batchTotalKwh,
        daily_spend_kobo: evaluation.dailySpendKobo,
        remaining_kobo: evaluation.remainingKobo,
        meter_id: meter.id,
        meter_label: meter.label,
        account_number: meter.account_number,
        provider_name: provider?.name,
        triggered_at: new Date().toISOString(),
      },
      cycleKey,
    );

    if (sent) webhooks++;
  }

  return { evaluated: rows.length, webhooks };
}

/** Runs Power Shield (push/SMS/auto top-up) plus outbound low-token webhooks. */
export async function evaluateEsoPayWalletThresholdMonitor(
  supabase: SupabaseClient,
  options?: { userId?: string; sendPush?: boolean },
): Promise<{
  power_shield: { evaluated: number; sent: number };
  token_webhooks: { evaluated: number; webhooks: number };
  wallet_webhooks: { evaluated: number; webhooks: number };
}> {
  const power_shield = await evaluatePowerShieldAlerts(supabase, options);
  const token_webhooks = await evaluateTokenReserveThresholdWebhooks(supabase, options);
  const wallet_webhooks = await evaluateWalletBalanceThresholds(supabase, options);

  return { power_shield, token_webhooks, wallet_webhooks };
}
