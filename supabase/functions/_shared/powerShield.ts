import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { deliverPrepaidTokenMultiChannel } from "./prepaidTokenDelivery.ts";
import { PENDING_FULFILLMENT_STATUS } from "./utilityBillFulfillmentCore.ts";
import { isDiscoDowntimeError } from "./utilityBillFulfillment.ts";
import { ensureUserWallet } from "./esopay.ts";
import { sendExpoPush, type ExpoPushMessage } from "./expoPush.ts";
import { recordGridLedgerEntry } from "./gridLedger.ts";
import { sendTermiiSms } from "./termiiSms.ts";
import {
  AUTO_TOP_UP_COOLDOWN_MS,
  CAPACITY_CRITICAL_THRESHOLD_PCT,
  CAPACITY_WARN_THRESHOLD_PCT,
  type PowerShieldAlertLevel,
  type PowerShieldAlertTier,
  buildMeterProjection,
  classifyCapacityAlertLevel,
  computeRemainingKobo,
  effectiveDailySpendKobo,
  pickCapacityAlertTier,
  resolveDailySpend,
} from "./powerShieldEngine.ts";
import {
  buildVolumeMeterProjection,
  type VolumePurchaseRow,
} from "./volumeThresholdEngine.ts";
import { executeMonnifyBillPipelineForProvider } from "./monnifyBillPipeline.ts";
import { formatShieldPayloadText } from "./powerShieldCopy.ts";

export type { PowerShieldAlertLevel, PowerShieldAlertTier } from "./powerShieldEngine.ts";
export {
  classifyCapacityAlertLevel,
  computeCapacityRemainingPct,
  learnDailySpendFromPurchases,
  pickCapacityAlertTier,
} from "./powerShieldEngine.ts";

export type PrepaidMeterRow = {
  id: string;
  user_id: string;
  utility_provider_id: string;
  account_number: string;
  label: string;
  daily_spend_kobo: number | null;
  learned_daily_spend_kobo: number | null;
  last_purchase_amount_kobo: number | null;
  last_purchase_at: string | null;
  last_token_or_receipt: string | null;
  estimated_depletion_at: string | null;
  burn_confidence: string | null;
  daily_spend_source: string | null;
  auto_top_up_enabled: boolean;
  capacity_remaining_pct: number | null;
  alert_state: string;
  auto_top_up_execute_at: string | null;
  notify_warn_10: boolean;
  notify_critical_5: boolean;
  last_alert_warn_10_at: string | null;
  last_alert_critical_5_at: string | null;
  last_purchase_total_kwh: number | null;
  learned_daily_kwh: number | null;
  user_daily_kwh: number | null;
  created_at: string;
  updated_at: string;
};

export type UtilityProviderMini = {
  id: string;
  name: string;
  category: string;
  monnify_biller_code: string;
  monnify_product_code: string;
};

type PurchaseRow = {
  amount_kobo: number;
  completed_at: string | null;
  created_at: string;
  account_number: string;
  utility_provider_id: string;
  token_or_receipt: string | null;
};

export function meterToApi(
  meter: PrepaidMeterRow,
  provider: UtilityProviderMini | null,
  purchases: PurchaseRow[] = [],
  now = new Date(),
) {
  const spend = resolveDailySpend(meter, purchases);
  const dailySpendKobo = spend.dailySpendKobo;

  const volume = meter.last_purchase_at && meter.last_purchase_amount_kobo
    ? buildVolumeMeterProjection(
      meter,
      purchases as VolumePurchaseRow[],
      meter.last_purchase_at,
      meter.last_purchase_amount_kobo,
      now,
    )
    : null;

  const capacityPct = volume?.volume_remaining_pct ?? meter.capacity_remaining_pct;
  const { level } = classifyCapacityAlertLevel(capacityPct);

  return {
    id: meter.id,
    label: meter.label,
    account_number: meter.account_number,
    provider: provider
      ? {
        id: provider.id,
        name: provider.name,
        category: provider.category,
        monnify_biller_code: provider.monnify_biller_code,
      }
      : null,
    daily_spend_kobo: dailySpendKobo,
    user_daily_spend_kobo: meter.daily_spend_kobo,
    learned_daily_spend_kobo: meter.learned_daily_spend_kobo,
    daily_spend_source: meter.daily_spend_source ?? spend.source,
    burn_confidence: meter.burn_confidence ?? spend.confidence,
    needs_daily_spend_setup: spend.source !== "user" && spend.confidence === "low",
    last_purchase_amount_kobo: meter.last_purchase_amount_kobo,
    last_purchase_at: meter.last_purchase_at,
    last_token_or_receipt: meter.last_token_or_receipt,
    // Brand-safety requirement: eliminate time-to-empty/countdown values.
    estimated_depletion_at: null,
    capacity_remaining_pct: capacityPct ?? meter.capacity_remaining_pct,
    volume_remaining_pct: volume?.volume_remaining_pct ?? capacityPct,
    batch_total_kwh: volume?.batch_total_kwh ?? meter.last_purchase_total_kwh,
    remaining_kwh: volume?.remaining_kwh ?? null,
    shield_context_text: volume?.shield_context_text ?? null,
    hours_remaining: null,
    hours_remaining_low: null,
    hours_remaining_high: null,
    alert_level: level,
    alert_state: meter.alert_state ?? level,
    auto_top_up_enabled: meter.auto_top_up_enabled ?? false,
    auto_top_up_execute_at: meter.auto_top_up_execute_at,
    notify_warn_10: meter.notify_warn_10 ?? true,
    notify_critical_5: meter.notify_critical_5 ?? true,
  };
}

async function fetchProviderMap(
  supabase: SupabaseClient,
  providerIds: string[],
): Promise<Map<string, UtilityProviderMini>> {
  if (providerIds.length === 0) return new Map();
  const { data } = await supabase
    .from("utility_providers")
    .select("id, name, category, monnify_biller_code, monnify_product_code")
    .in("id", providerIds);
  return new Map((data ?? []).map((row) => [row.id, row as UtilityProviderMini]));
}

async function fetchElectricityPurchases(
  supabase: SupabaseClient,
  userId: string,
  accountNumber: string,
  providerId: string,
): Promise<PurchaseRow[]> {
  const { data, error } = await supabase
    .from("utility_purchases")
    .select(
      "amount_kobo, completed_at, created_at, account_number, utility_provider_id, token_or_receipt",
    )
    .eq("user_id", userId)
    .eq("utility_provider_id", providerId)
    .eq("account_number", accountNumber)
    .eq("status", "success")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(12);

  if (error) throw new Error(error.message);
  return (data ?? []) as PurchaseRow[];
}

export async function upsertMeterFromLatestPurchase(
  supabase: SupabaseClient,
  userId: string,
  providerId: string,
  accountNumber: string,
  label?: string,
): Promise<PrepaidMeterRow | null> {
  const purchases = await fetchElectricityPurchases(
    supabase,
    userId,
    accountNumber,
    providerId,
  );
  if (purchases.length === 0) return null;

  const latest = purchases[0];
  const lastAt = latest.completed_at ?? latest.created_at;
  const chronological = [...purchases].reverse();

  const { data: existing } = await supabase
    .from("prepaid_electricity_meters")
    .select("daily_spend_kobo")
    .eq("user_id", userId)
    .eq("utility_provider_id", providerId)
    .eq("account_number", accountNumber)
    .maybeSingle();

  const projection = buildMeterProjection(
    { daily_spend_kobo: existing?.daily_spend_kobo ?? null, learned_daily_spend_kobo: null },
    chronological,
    lastAt,
    latest.amount_kobo,
  );

  const { data, error } = await supabase
    .from("prepaid_electricity_meters")
    .upsert({
      user_id: userId,
      utility_provider_id: providerId,
      account_number: accountNumber,
      label: label ?? "My meter",
      learned_daily_spend_kobo: projection.learned_daily_spend_kobo,
      last_purchase_amount_kobo: latest.amount_kobo,
      last_purchase_at: lastAt,
      last_token_or_receipt: latest.token_or_receipt,
      estimated_depletion_at: projection.estimated_depletion_at,
      capacity_remaining_pct: projection.capacity_remaining_pct,
      last_purchase_total_kwh: projection.last_purchase_total_kwh,
      learned_daily_kwh: projection.learned_daily_kwh,
      alert_state: projection.alert_state,
      burn_confidence: projection.burn_confidence,
      daily_spend_source: projection.daily_spend_source,
      last_alert_warn_10_at: null,
      last_alert_critical_5_at: null,
      auto_top_up_execute_at: null,
    }, { onConflict: "user_id,utility_provider_id,account_number" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as PrepaidMeterRow;
}

export async function syncPowerShieldMeters(
  supabase: SupabaseClient,
  userId: string,
): Promise<PrepaidMeterRow[]> {
  const { data: purchases, error } = await supabase
    .from("utility_purchases")
    .select(
      "utility_provider_id, account_number, amount_kobo, completed_at, created_at, token_or_receipt",
    )
    .eq("user_id", userId)
    .eq("status", "success")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const providerIds = [...new Set((purchases ?? []).map((p) => p.utility_provider_id))];
  const { data: providers } = await supabase
    .from("utility_providers")
    .select("id, category")
    .in("id", providerIds);

  const electricityProviderIds = new Set(
    (providers ?? []).filter((p) => p.category === "electricity").map((p) => p.id),
  );

  const latestByKey = new Map<string, PurchaseRow & { utility_provider_id: string }>();
  for (const row of purchases ?? []) {
    if (!electricityProviderIds.has(row.utility_provider_id)) continue;
    const key = `${row.utility_provider_id}|${row.account_number}`;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, row as PurchaseRow & { utility_provider_id: string });
    }
  }

  const meters: PrepaidMeterRow[] = [];
  for (const [key] of latestByKey) {
    const sep = key.indexOf("|");
    const providerId = key.slice(0, sep);
    const accountNumber = key.slice(sep + 1);
    const meter = await upsertMeterFromLatestPurchase(
      supabase,
      userId,
      providerId,
      accountNumber,
    );
    if (meter) meters.push(meter);
  }

  return meters;
}

export async function listPowerShieldMeters(
  supabase: SupabaseClient,
  userId: string,
) {
  await syncPowerShieldMeters(supabase, userId);

  const { data: meters, error } = await supabase
    .from("prepaid_electricity_meters")
    .select("*")
    .eq("user_id", userId)
    .order("capacity_remaining_pct", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  const rows = (meters ?? []) as PrepaidMeterRow[];
  const providerMap = await fetchProviderMap(
    supabase,
    [...new Set(rows.map((m) => m.utility_provider_id))],
  );

  const now = new Date();
  const meterIds = rows.map((m) => m.id);

  const purchasesByMeter = new Map<string, PurchaseRow[]>();
  await Promise.all(rows.map(async (m) => {
    const purchases = await fetchElectricityPurchases(
      supabase,
      userId,
      m.account_number,
      m.utility_provider_id,
    );
    purchasesByMeter.set(m.id, purchases);
  }));

  const { data: feedbackRows } = meterIds.length > 0
    ? await supabase
      .from("power_shield_feedback")
      .select("meter_id, context, created_at")
      .eq("user_id", userId)
      .in("meter_id", meterIds)
    : { data: [] as { meter_id: string; context: string; created_at: string }[] };

  const feedbackByMeter = new Map<string, { context: string; created_at: string }[]>();
  for (const row of feedbackRows ?? []) {
    const list = feedbackByMeter.get(row.meter_id) ?? [];
    list.push(row);
    feedbackByMeter.set(row.meter_id, list);
  }

  const apiMeters = rows.map((m) => {
    const purchases = purchasesByMeter.get(m.id) ?? [];
    const base = meterToApi(m, providerMap.get(m.utility_provider_id) ?? null, purchases, now);
    const meterFeedback = feedbackByMeter.get(m.id) ?? [];
    const lastPurchaseAt = m.last_purchase_at ? new Date(m.last_purchase_at).getTime() : 0;
    const hasRecentAlertFeedback = meterFeedback.some(
      (f) => f.context === "alert_check" && new Date(f.created_at).getTime() >= lastPurchaseAt,
    );
    const needsAlertFeedback = base.alert_level !== "safe" &&
      base.alert_level !== "unknown" &&
      !hasRecentAlertFeedback;

    return {
      ...base,
      feedback_pending: needsAlertFeedback,
    };
  });

  const accuracy = await getPowerShieldAccuracyStats(supabase);

  const worst = apiMeters.reduce<PowerShieldAlertLevel>((acc, m) => {
    const rank: Record<PowerShieldAlertLevel, number> = {
      expired: 5,
      critical: 4,
      warn_10: 3,
      safe: 1,
      unknown: 0,
    };
    return rank[m.alert_level] > rank[acc] ? m.alert_level : acc;
  }, "unknown");

  const needsSetupCount = apiMeters.filter((m) => m.needs_daily_spend_setup).length;

  return {
    meters: apiMeters,
    summary: {
      meter_count: apiMeters.length,
      worst_alert_level: worst,
      next_depletion_at: null,
      next_meter_label: null,
      hours_until_blackout: null,
      accuracy_sample_size: accuracy.sample_size,
      accuracy_rate: accuracy.accuracy_rate,
      meters_needing_daily_spend: needsSetupCount,
      alert_engine_version: 4,
      threshold_basis: "volume_pct",
      capacity_warn_threshold_pct: CAPACITY_WARN_THRESHOLD_PCT,
      capacity_critical_threshold_pct: CAPACITY_CRITICAL_THRESHOLD_PCT,
    },
  };
}

export async function updatePowerShieldMeter(
  supabase: SupabaseClient,
  userId: string,
  meterId: string,
  patch: {
    label?: string;
    daily_spend_kobo?: number | null;
    auto_top_up_enabled?: boolean;
    notify_warn_10?: boolean;
    notify_critical_5?: boolean;
  },
) {
  const { data: existing, error: fetchError } = await supabase
    .from("prepaid_electricity_meters")
    .select("*")
    .eq("id", meterId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) {
    const err = new Error("Meter not found") as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  const meter = existing as PrepaidMeterRow;
  const nextDaily = patch.daily_spend_kobo !== undefined
    ? patch.daily_spend_kobo
    : meter.daily_spend_kobo;

  const purchases = await fetchElectricityPurchases(
    supabase,
    userId,
    meter.account_number,
    meter.utility_provider_id,
  );

  let updatePayload: Record<string, unknown> = {
    ...(patch.label !== undefined ? { label: patch.label } : {}),
    ...(patch.daily_spend_kobo !== undefined ? { daily_spend_kobo: patch.daily_spend_kobo } : {}),
    ...(patch.auto_top_up_enabled !== undefined
      ? { auto_top_up_enabled: patch.auto_top_up_enabled }
      : {}),
    ...(patch.notify_warn_10 !== undefined ? { notify_warn_10: patch.notify_warn_10 } : {}),
    ...(patch.notify_critical_5 !== undefined
      ? { notify_critical_5: patch.notify_critical_5 }
      : {}),
  };

  if (
    meter.last_purchase_at &&
    meter.last_purchase_amount_kobo &&
    true
  ) {
    const projection = buildMeterProjection(
      { daily_spend_kobo: nextDaily, learned_daily_spend_kobo: meter.learned_daily_spend_kobo },
      [...purchases].reverse(),
      meter.last_purchase_at,
      meter.last_purchase_amount_kobo,
    );
    updatePayload = {
      ...updatePayload,
      // Brand-safety: eliminate any TTE/countdown from persisted meter rows.
      estimated_depletion_at: null,
      capacity_remaining_pct: projection.capacity_remaining_pct,
      last_purchase_total_kwh: projection.last_purchase_total_kwh,
      learned_daily_kwh: projection.learned_daily_kwh,
      alert_state: projection.alert_state,
      burn_confidence: projection.burn_confidence,
      daily_spend_source: patch.daily_spend_kobo !== undefined ? "user" : projection.daily_spend_source,
      learned_daily_spend_kobo: projection.learned_daily_spend_kobo,
    };
  }

  const { data, error } = await supabase
    .from("prepaid_electricity_meters")
    .update(updatePayload)
    .eq("id", meterId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const providerMap = await fetchProviderMap(supabase, [(data as PrepaidMeterRow).utility_provider_id]);
  return meterToApi(
    data as PrepaidMeterRow,
    providerMap.get((data as PrepaidMeterRow).utility_provider_id) ?? null,
    purchases,
  );
}

function siteLabel(meter: PrepaidMeterRow, providerName: string): string {
  return meter.label?.trim() || providerName;
}

function buildAlertMessage(
  meter: PrepaidMeterRow,
  providerName: string,
  tier: PowerShieldAlertTier,
  autoTopUpEnabled: boolean,
  shieldContext?: string | null,
  remainingKwh?: number | null,
): { title: string; body: string; sms: string } {
  const payload = shieldContext ??
    (remainingKwh != null
      ? formatShieldPayloadText(tier, remainingKwh)
      : formatShieldPayloadText(tier, 0));
  void meter;
  void providerName;
  void autoTopUpEnabled;
  return {
    title: "Power Shield",
    body: payload,
    sms: payload,
  };
}

function buildAutoTopUpSuccessMessage(meter: PrepaidMeterRow, providerName: string): {
  title: string;
  body: string;
  sms: string;
} {
  const name = siteLabel(meter, providerName);
  const body =
    `✅ POWER SHIELD: Energy restored | ${name} topped up successfully. Your prepaid token is active and capacity is back above safety thresholds.`;
  return { title: "POWER SHIELD: Top-up complete", body, sms: body };
}

async function fetchUserPhone(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", userId)
    .maybeSingle();
  return data?.phone?.trim() || null;
}

async function deliverPowerShieldAlert(
  supabase: SupabaseClient,
  meter: PrepaidMeterRow,
  copy: { title: string; body: string; sms: string },
  tier: PowerShieldAlertTier,
  options?: { sendPush?: boolean },
): Promise<number> {
  let sent = 0;

  if (options?.sendPush !== false) {
    const { data: tokens } = await supabase
      .from("eso_pay_push_tokens")
      .select("expo_push_token")
      .eq("user_id", meter.user_id)
      .eq("enabled", true)
      .eq("power_shield_enabled", true);

    const messages: ExpoPushMessage[] = (tokens ?? []).map((t) => ({
      to: t.expo_push_token,
      title: copy.title,
      body: copy.body,
      sound: tier === "critical"
        ? {
          critical: 1,
          name: "default",
          volume: 1.0,
        }
        : "default",
      channelId: tier === "critical" ? "power-shield-critical" : "power-shield-high",
      priority: tier === "critical" ? "high" : "high",
      ios:
        tier === "critical"
          ? {
            interruptionLevel: "critical",
            priority: 10,
            sound: {
              critical: 1,
              name: "default",
              volume: 1.0,
            },
          }
          : {
            interruptionLevel: "timeSensitive",
            priority: 10,
          },
      android:
        tier === "critical"
          ? {
            channelId: "power-shield-critical",
            priority: "max",
            visibility: "public",
            bypassDnd: true,
          }
          : {
            channelId: "power-shield-high",
            priority: "high",
            visibility: "public",
            bypassDnd: false,
          },
      data: {
        type: "power_shield",
        meter_id: meter.id,
        alert_level: tier,
        capacity_tier: tier,
      },
    }));

    if (messages.length > 0) {
      await sendExpoPush(messages);
      sent += messages.length;
    }
  }

  const phone = await fetchUserPhone(supabase, meter.user_id);
  if (phone) {
    await sendTermiiSms(phone, copy.sms);
  }

  return sent;
}

function resolveAutoTopUpAmountKobo(meter: PrepaidMeterRow): number {
  if (meter.last_purchase_amount_kobo && meter.last_purchase_amount_kobo > 0) {
    return meter.last_purchase_amount_kobo;
  }
  const daily = meter.daily_spend_kobo ?? 50_000;
  return Math.max(daily * 7, 3_000);
}

type AutoTopUpResult =
  | {
    ok: true;
    token_or_receipt: string | null;
    amount_kobo: number;
    monnify_transaction_reference: string;
  }
  | {
    ok: false;
    code: "FAILED_INSUFFICIENT_FUNDS" | "MONNIFY_FAILED" | "MISSING_PROVIDER";
    message: string;
  };

async function executePowerShieldAutoTopUp(
  supabase: SupabaseClient,
  userId: string,
  meter: PrepaidMeterRow,
  provider: UtilityProviderMini,
): Promise<AutoTopUpResult> {
  const amountKobo = resolveAutoTopUpAmountKobo(meter);
  const accountNumber = meter.account_number;
  const billerCode = provider.monnify_biller_code?.trim();
  const productCode = provider.monnify_product_code?.trim();

  if (!billerCode || !productCode) {
    return {
      ok: false,
      code: "MISSING_PROVIDER",
      message: `Monnify biller not configured for ${provider.name}`,
    };
  }

  const idempotencyKey = `ps-auto-${meter.id}-${Date.now()}`;
  const paymentReference = `eso-ps-auto-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const wallet = await ensureUserWallet(supabase, userId);
  if (wallet.balance_kobo < amountKobo) {
    await supabase.from("utility_purchases").upsert(
      {
        user_id: userId,
        utility_provider_id: meter.utility_provider_id,
        account_number: accountNumber,
        amount_kobo: amountKobo,
        status: "failed_insufficient_funds",
        monnify_payment_reference: paymentReference,
        monnify_transaction_reference: null,
        wallet_transaction_id: null,
        token_or_receipt: null,
        fulfillment_provider: "monnify",
        failure_code: "FAILED_INSUFFICIENT_FUNDS",
        failure_message: "Monnify wallet balance too low for auto top-up",
        idempotency_key: idempotencyKey,
        initiated_by: userId,
      },
      { onConflict: "idempotency_key" },
    );

    return {
      ok: false,
      code: "FAILED_INSUFFICIENT_FUNDS",
      message: "Monnify wallet balance too low for auto top-up",
    };
  }

  const { data: walletTx, error: debitError } = await supabase.rpc("esopay_debit_wallet", {
    p_company_id: userId,
    p_amount_kobo: amountKobo,
    p_type: "bill_payment",
    p_monnify_payment_ref: paymentReference,
    p_narration: `Power Shield auto top-up — ${meter.label}`,
    p_metadata: { meter_id: meter.id, auto_top_up: true, fulfillment: "monnify" },
    p_idempotency_key: idempotencyKey,
  });

  if (debitError) {
    const isInsufficient = debitError.message.toLowerCase().includes("insufficient");
    return {
      ok: false,
      code: isInsufficient ? "FAILED_INSUFFICIENT_FUNDS" : "MONNIFY_FAILED",
      message: debitError.message,
    };
  }

  let monnifyPay;
  try {
    const pipeline = await executeMonnifyBillPipelineForProvider(provider, {
      customerId: accountNumber,
      amountKobo,
      paymentReference,
    });
    monnifyPay = pipeline.payResult;
  } catch (payErr) {
    const message = payErr instanceof Error ? payErr.message : "Monnify auto top-up failed";

    if (isDiscoDowntimeError(payErr)) {
      await supabase.from("utility_purchases").upsert({
        user_id: userId,
        utility_provider_id: meter.utility_provider_id,
        account_number: accountNumber,
        amount_kobo: amountKobo,
        status: PENDING_FULFILLMENT_STATUS,
        monnify_payment_reference: paymentReference,
        monnify_transaction_reference: null,
        wallet_transaction_id: walletTx?.id ?? null,
        fulfillment_provider: "monnify",
        idempotency_key: idempotencyKey,
        initiated_by: userId,
        fulfillment_queued_at: new Date().toISOString(),
        fulfillment_next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
        failure_code: "DISCO_DOWNTIME",
        failure_message: message,
      }, { onConflict: "idempotency_key" });

      return {
        ok: false,
        code: "MONNIFY_FAILED",
        message: "DisCo maintenance — token queued for automatic delivery",
      };
    }

    await supabase.rpc("esopay_credit_wallet", {
      p_company_id: userId,
      p_amount_kobo: amountKobo,
      p_monnify_tx_ref: `refund-${paymentReference}`,
      p_monnify_payment_ref: paymentReference,
      p_narration: "Refund — Power Shield Monnify auto top-up",
      p_metadata: { meter_id: meter.id, refund: true },
    });
    return { ok: false, code: "MONNIFY_FAILED", message };
  }

  if (monnifyPay.status === "FAILED") {
    await supabase.rpc("esopay_credit_wallet", {
      p_company_id: userId,
      p_amount_kobo: amountKobo,
      p_monnify_tx_ref: `refund-${paymentReference}`,
      p_monnify_payment_ref: paymentReference,
      p_narration: "Refund — Power Shield Monnify auto top-up",
      p_metadata: { meter_id: meter.id, refund: true },
    });
    return {
      ok: false,
      code: "MONNIFY_FAILED",
      message: "Monnify bill payment failed",
    };
  }

  const txRef = monnifyPay.transactionReference ?? paymentReference;
  const tokenReceipt = monnifyPay.rechargeToken ?? null;

  await supabase.from("utility_purchases").upsert({
    user_id: userId,
    utility_provider_id: meter.utility_provider_id,
    account_number: accountNumber,
    amount_kobo: amountKobo,
    status: "success",
    monnify_payment_reference: paymentReference,
    monnify_transaction_reference: txRef,
    wallet_transaction_id: walletTx?.id ?? null,
    token_or_receipt: tokenReceipt,
    fulfillment_provider: "monnify",
    idempotency_key: idempotencyKey,
    initiated_by: userId,
    completed_at: new Date().toISOString(),
  }, { onConflict: "idempotency_key" });

  await upsertMeterFromLatestPurchase(supabase, userId, meter.utility_provider_id, accountNumber);

  await recordGridLedgerEntry(supabase, {
    user_id: userId,
    meter_id: meter.id,
    entry_type: "token_credit",
    amount_kobo: amountKobo,
    capacity_pct: 100,
    message: `Auto top-up credited via Monnify · ${meter.label}`,
    metadata: {
      payment_reference: paymentReference,
      token_or_receipt: tokenReceipt,
      monnify_transaction_reference: txRef,
      wallet_transaction_id: walletTx?.id,
    },
  });

  if (tokenReceipt?.trim()) {
    await deliverPrepaidTokenMultiChannel(supabase, userId, {
      meterName: meter.label,
      token: tokenReceipt,
      amountKobo,
      accountNumber,
      paymentReference,
    });
  }

  return {
    ok: true,
    token_or_receipt: tokenReceipt,
    amount_kobo: amountKobo,
    monnify_transaction_reference: txRef,
  };
}

export async function evaluatePowerShieldAlerts(
  supabase: SupabaseClient,
  options?: { userId?: string; sendPush?: boolean },
): Promise<{ evaluated: number; sent: number }> {
  let query = supabase
    .from("prepaid_electricity_meters")
    .select("*")
    .not("last_purchase_at", "is", null);

  if (options?.userId) query = query.eq("user_id", options.userId);

  const { data: meters, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (meters ?? []) as PrepaidMeterRow[];
  const providerMap = await fetchProviderMap(
    supabase,
    [...new Set(rows.map((m) => m.utility_provider_id))],
  );

  let sent = 0;
  const now = new Date();

  for (const meter of rows) {
    const purchases = await fetchElectricityPurchases(
      supabase,
      meter.user_id,
      meter.account_number,
      meter.utility_provider_id,
    );
    const volume = meter.last_purchase_at && meter.last_purchase_amount_kobo
      ? buildVolumeMeterProjection(
        meter,
        purchases as VolumePurchaseRow[],
        meter.last_purchase_at,
        meter.last_purchase_amount_kobo,
        now,
      )
      : null;
    const capacityPct = volume?.volume_remaining_pct ?? meter.capacity_remaining_pct;
    const { level, alertState } = classifyCapacityAlertLevel(capacityPct);
    const provider = providerMap.get(meter.utility_provider_id);
    const providerName = provider?.name ?? "your DisCo";

    const basePatch: Record<string, unknown> = {
      capacity_remaining_pct: capacityPct,
      alert_state: alertState,
    };

    if (
      capacityPct != null &&
      capacityPct > CAPACITY_WARN_THRESHOLD_PCT &&
      (meter.alert_state === "warn_10" || meter.alert_state === "critical")
    ) {
      basePatch.alert_state = "safe";
      basePatch.auto_top_up_execute_at = null;
    }

    const tier = pickCapacityAlertTier(meter, level, capacityPct, now);

    if (tier === "warn_10" && capacityPct != null) {
      const copy = buildAlertMessage(
        meter,
        providerName,
        "warn_10",
        false,
        volume?.shield_context_text,
        volume?.remaining_kwh,
      );
      sent += await deliverPowerShieldAlert(supabase, meter, copy, "warn_10", options);
      await recordGridLedgerEntry(supabase, {
        user_id: meter.user_id,
        meter_id: meter.id,
        entry_type: "capacity_alert",
        capacity_pct: capacityPct,
        message: copy.body,
        metadata: { tier: "warn_10", shield_context: volume?.shield_context_text },
      });
      basePatch.last_alert_warn_10_at = now.toISOString();
      basePatch.alert_state = "warn_10";
    } else if (tier === "critical" && capacityPct != null) {
      const copy = buildAlertMessage(
        meter,
        providerName,
        "critical",
        meter.auto_top_up_enabled,
        volume?.shield_context_text,
        volume?.remaining_kwh,
      );
      sent += await deliverPowerShieldAlert(supabase, meter, copy, "critical", options);
      await recordGridLedgerEntry(supabase, {
        user_id: meter.user_id,
        meter_id: meter.id,
        entry_type: "capacity_alert",
        capacity_pct: capacityPct,
        message: copy.body,
        metadata: {
          tier: "critical",
          shield_context: volume?.shield_context_text,
          auto_top_up: meter.auto_top_up_enabled,
        },
      });
      basePatch.last_alert_critical_5_at = now.toISOString();
      basePatch.alert_state = "critical";

      // Immediate Monnify auto-top-up at the 5% boundary (no time-based TTE/countdown logic).
      if (meter.auto_top_up_enabled && provider) {
        const result = await executePowerShieldAutoTopUp(
          supabase,
          meter.user_id,
          meter,
          provider,
        );

        if (result.ok) {
          const successCopy = buildAutoTopUpSuccessMessage(meter, providerName);
          await recordGridLedgerEntry(supabase, {
            user_id: meter.user_id,
            meter_id: meter.id,
            entry_type: "auto_top_up_success",
            amount_kobo: result.amount_kobo,
            capacity_pct: 100,
            message: successCopy.body,
            metadata: { token_or_receipt: result.token_or_receipt },
          });

          // executePowerShieldAutoTopUp upserts meter state; avoid overwriting with stale basePatch.
          continue;
        }

        await recordGridLedgerEntry(supabase, {
          user_id: meter.user_id,
          meter_id: meter.id,
          entry_type: "auto_top_up_failed",
          capacity_pct: capacityPct,
          message: result.message,
          metadata: { code: result.code },
        });

        basePatch.auto_top_up_execute_at = null;
        basePatch.alert_state = "critical";
      }
    }

    await supabase.from("prepaid_electricity_meters").update(basePatch).eq("id", meter.id);
  }

  return { evaluated: rows.length, sent };
}

export async function registerEsoPayPushToken(
  supabase: SupabaseClient,
  userId: string,
  body: {
    expo_push_token: string;
    platform: string;
    app_version?: string;
    power_shield_enabled?: boolean;
  },
) {
  const platform = body.platform === "ios" || body.platform === "android" || body.platform === "web"
    ? body.platform
    : "android";

  const { data, error } = await supabase
    .from("eso_pay_push_tokens")
    .upsert({
      user_id: userId,
      expo_push_token: body.expo_push_token,
      platform,
      app_version: body.app_version ?? "1.0.0",
      power_shield_enabled: body.power_shield_enabled ?? true,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "expo_push_token" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function refreshMeterAfterPurchase(
  supabase: SupabaseClient,
  userId: string,
  providerId: string,
  accountNumber: string,
) {
  const { data: provider } = await supabase
    .from("utility_providers")
    .select("category")
    .eq("id", providerId)
    .maybeSingle();

  if (provider?.category !== "electricity") return null;

  const meter = await upsertMeterFromLatestPurchase(supabase, userId, providerId, accountNumber);
  if (meter) {
    await evaluatePowerShieldAlerts(supabase, { userId, sendPush: true });
  }
  return meter;
}

export type PowerShieldFeedbackOutcome =
  | "accurate"
  | "too_early"
  | "too_late"
  | "no_blackout"
  | "had_blackout";

export type PowerShieldFeedbackContext = "post_payment" | "alert_check";

export async function getPowerShieldAccuracyStats(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("power_shield_feedback")
    .select("outcome")
    .in("outcome", ["accurate", "too_early", "too_late"]);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const sampleSize = rows.length;
  const accurateCount = rows.filter((row) => row.outcome === "accurate").length;
  const minSample = 5;
  const accuracyRate = sampleSize >= minSample
    ? Math.round((accurateCount / sampleSize) * 100)
    : null;

  return {
    sample_size: sampleSize,
    accurate_count: accurateCount,
    accuracy_rate: accuracyRate,
  };
}

export async function submitPowerShieldFeedback(
  supabase: SupabaseClient,
  userId: string,
  body: {
    meter_id?: string;
    context: PowerShieldFeedbackContext;
    outcome: PowerShieldFeedbackOutcome;
    predicted_depletion_at?: string | null;
    alert_level?: string | null;
    hours_remaining_at_feedback?: number | null;
  },
) {
  if (body.meter_id) {
    const { data: meter } = await supabase
      .from("prepaid_electricity_meters")
      .select("id")
      .eq("id", body.meter_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!meter) {
      const err = new Error("Meter not found") as Error & { status?: number };
      err.status = 404;
      throw err;
    }
  }

  const { data, error } = await supabase
    .from("power_shield_feedback")
    .insert({
      user_id: userId,
      meter_id: body.meter_id ?? null,
      context: body.context,
      outcome: body.outcome,
      predicted_depletion_at: body.predicted_depletion_at ?? null,
      alert_level: body.alert_level ?? null,
      hours_remaining_at_feedback: body.hours_remaining_at_feedback ?? null,
    })
    .select("id, outcome, created_at")
    .single();

  if (error) throw new Error(error.message);

  const stats = await getPowerShieldAccuracyStats(supabase);

  return {
    feedback_id: data.id,
    accuracy: stats,
  };
}

// Re-export for API consumers that still call effectiveDailySpendKobo(meter)
export { effectiveDailySpendKobo } from "./powerShieldEngine.ts";
