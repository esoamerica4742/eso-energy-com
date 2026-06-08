/**
 * Eso Pay Bills — volume-percentage threshold gold standard.
 * Warn/critical tiers are % of total kWh vended in the last Monnify purchase batch,
 * not time-only countdowns.
 */

import {
  CAPACITY_CRITICAL_THRESHOLD_PCT,
  CAPACITY_WARN_THRESHOLD_PCT,
  MS_PER_DAY,
  SINGLE_PURCHASE_ASSUMED_DAYS,
  type BurnConfidence,
  type DailySpendSource,
  type PowerShieldAlertState,
  classifyCapacityAlertLevel,
  learnDailySpendFromPurchases,
  type MeterSpendInput,
  type PurchaseRow,
} from "./powerShieldEngine.ts";
import {
  formatShieldPayloadText,
  shieldTierFromVolumePct,
} from "./powerShieldCopy.ts";

export {
  CAPACITY_WARN_THRESHOLD_PCT,
  CAPACITY_CRITICAL_THRESHOLD_PCT,
};

/** Slower-than-mid load → longer runway (upper bound). */
const DEFAULT_TARIFF_NGN_PER_KWH = 65;

export type VolumePurchaseRow = PurchaseRow & {
  token_or_receipt?: string | null;
};

export type VolumeMeterInput = MeterSpendInput & {
  last_purchase_total_kwh?: number | null;
  user_daily_kwh?: number | null;
  learned_daily_kwh?: number | null;
  last_token_or_receipt?: string | null;
};

function readEnv(key: string): string | undefined {
  if (typeof Deno !== "undefined") {
    return Deno.env.get(key)?.trim();
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key]?.trim();
  }
  return undefined;
}

export function defaultTariffNgnPerKwh(): number {
  const raw = readEnv("ESO_PAY_DEFAULT_TARIFF_NGN_PER_KWH");
  if (!raw) return DEFAULT_TARIFF_NGN_PER_KWH;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TARIFF_NGN_PER_KWH;
}

export function parseKwhFromTokenReceipt(token: string | null | undefined): number | null {
  if (!token?.trim()) return null;
  const text = token.trim();

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const candidates = [
      parsed.units,
      parsed.kwh,
      parsed.KWH,
      parsed.unit,
      parsed.energy,
    ];
    for (const value of candidates) {
      const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
      if (Number.isFinite(n) && n > 0) return roundKwh(n);
    }
  } catch {
    /* plain text token */
  }

  const kwhMatch = text.match(/(\d+(?:\.\d+)?)\s*kwh/i);
  if (kwhMatch) return roundKwh(Number(kwhMatch[1]));

  const unitsMatch = text.match(/units?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  if (unitsMatch) return roundKwh(Number(unitsMatch[1]));

  return null;
}

function roundKwh(value: number): number {
  return Math.round(value * 10) / 10;
}

export function inferBatchKwhFromAmount(
  amountKobo: number,
  tariffNgnPerKwh = defaultTariffNgnPerKwh(),
): number {
  const ngn = amountKobo / 100;
  if (ngn <= 0 || tariffNgnPerKwh <= 0) return 0;
  return roundKwh(Math.max(0.1, ngn / tariffNgnPerKwh));
}

export function resolveBatchTotalKwh(input: {
  amountKobo: number;
  tokenOrReceipt?: string | null;
  storedBatchKwh?: number | null;
}): number {
  const parsed = parseKwhFromTokenReceipt(input.tokenOrReceipt);
  if (parsed && parsed > 0) return parsed;
  const inferred = inferBatchKwhFromAmount(input.amountKobo);
  if (inferred > 0) return inferred;
  if (input.storedBatchKwh && input.storedBatchKwh > 0) return roundKwh(input.storedBatchKwh);
  return 0;
}

export function dailyKwhFromSpendKobo(
  dailySpendKobo: number,
  tariffNgnPerKwh = defaultTariffNgnPerKwh(),
): number {
  if (dailySpendKobo <= 0 || tariffNgnPerKwh <= 0) return 0;
  return roundKwh((dailySpendKobo / 100) / tariffNgnPerKwh);
}

export function learnDailyKwhFromPurchases(purchases: VolumePurchaseRow[]): number | null {
  if (purchases.length < 2) return null;

  const sorted = [...purchases].sort((a, b) => {
    const aAt = new Date(a.completed_at ?? a.created_at).getTime();
    const bAt = new Date(b.completed_at ?? b.created_at).getTime();
    return aAt - bAt;
  });

  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevAt = new Date(prev.completed_at ?? prev.created_at).getTime();
    const currAt = new Date(curr.completed_at ?? curr.created_at).getTime();
    const days = (currAt - prevAt) / MS_PER_DAY;
    if (days < 0.5 || days > 90) continue;

    const prevBatch = resolveBatchTotalKwh({
      amountKobo: prev.amount_kobo,
      tokenOrReceipt: prev.token_or_receipt,
    });
    if (prevBatch <= 0) continue;

    const daily = prevBatch / days;
    const weight = Math.pow(0.82, sorted.length - 1 - i);
    weightedSum += daily * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return null;
  return roundKwh(Math.max(0.1, weightedSum / weightTotal));
}

export function resolveDailyKwh(
  meter: VolumeMeterInput,
  purchases: VolumePurchaseRow[],
  batchTotalKwh: number,
): { dailyKwh: number; source: DailySpendSource; confidence: BurnConfidence } {
  if (meter.user_daily_kwh && meter.user_daily_kwh > 0) {
    return {
      dailyKwh: roundKwh(meter.user_daily_kwh),
      source: "user",
      confidence: "high",
    };
  }

  const learnedStored = meter.learned_daily_kwh;
  if (learnedStored && learnedStored > 0) {
    const confidence: BurnConfidence = purchases.length >= 4 ? "high" : "medium";
    return { dailyKwh: roundKwh(learnedStored), source: "learned", confidence };
  }

  const learned = learnDailyKwhFromPurchases(purchases);
  if (learned && learned > 0) {
    const confidence: BurnConfidence = purchases.length >= 4 ? "high" : "medium";
    return { dailyKwh: learned, source: "learned", confidence };
  }

  if (batchTotalKwh > 0) {
    return {
      dailyKwh: roundKwh(batchTotalKwh / SINGLE_PURCHASE_ASSUMED_DAYS),
      source: "estimated_single",
      confidence: "low",
    };
  }
  return {
    dailyKwh: 0,
    source: "inferred_default",
    confidence: "low",
  };
}

export function computeRemainingKwh(
  batchTotalKwh: number,
  lastPurchaseAt: string,
  dailyKwh: number,
  now = new Date(),
): number {
  const daysElapsed = Math.max(
    0,
    (now.getTime() - new Date(lastPurchaseAt).getTime()) / MS_PER_DAY,
  );
  const burned = dailyKwh * daysElapsed;
  return Math.max(0, roundKwh(batchTotalKwh - burned));
}

export function computeVolumeRemainingPct(
  batchTotalKwh: number,
  remainingKwh: number,
): number | null {
  if (batchTotalKwh <= 0) return null;
  return Math.min(100, Math.max(0, (remainingKwh / batchTotalKwh) * 100));
}

/** @deprecated Use formatShieldPayloadText via shieldTierFromVolumePct for alert copy. */
export function formatShieldContextText(
  volumePct: number,
  remainingKwh: number,
  _dailyKwh: number,
): string {
  const tier = shieldTierFromVolumePct(volumePct);
  if (tier) return formatShieldPayloadText(tier, remainingKwh);
  return `${Math.max(0, Math.round(volumePct))}% Remaining`;
}

export type VolumeThresholdProjection = {
  batch_total_kwh: number;
  remaining_kwh: number;
  daily_kwh: number;
  learned_daily_kwh: number | null;
  last_purchase_total_kwh: number;
  capacity_remaining_pct: number | null;
  volume_remaining_pct: number | null;
  shield_context_text: string | null;
  hours_remaining: null;
  hours_remaining_low: null;
  hours_remaining_high: null;
  estimated_depletion_at: null;
  alert_state: PowerShieldAlertState;
  burn_confidence: BurnConfidence;
  daily_spend_source: DailySpendSource;
  needs_daily_spend_setup: boolean;
};

export function buildVolumeMeterProjection(
  meter: VolumeMeterInput,
  purchases: VolumePurchaseRow[],
  lastPurchaseAt: string,
  lastPurchaseAmountKobo: number,
  now = new Date(),
): VolumeThresholdProjection | null {
  if (!lastPurchaseAt || lastPurchaseAmountKobo <= 0) return null;

  const latest = purchases[0];
  const batchTotalKwh = resolveBatchTotalKwh({
    amountKobo: lastPurchaseAmountKobo,
    tokenOrReceipt: latest?.token_or_receipt ?? meter.last_token_or_receipt,
    storedBatchKwh: meter.last_purchase_total_kwh,
  });

  if (batchTotalKwh <= 0) return null;

  const daily = resolveDailyKwh(meter, purchases, batchTotalKwh);
  const remainingKwh = computeRemainingKwh(batchTotalKwh, lastPurchaseAt, daily.dailyKwh, now);
  const volumePct = computeVolumeRemainingPct(batchTotalKwh, remainingKwh);
  const { alertState } = classifyCapacityAlertLevel(volumePct);

  return {
    batch_total_kwh: batchTotalKwh,
    remaining_kwh: remainingKwh,
    daily_kwh: daily.dailyKwh,
    learned_daily_kwh: learnDailyKwhFromPurchases(purchases),
    last_purchase_total_kwh: batchTotalKwh,
    capacity_remaining_pct: volumePct,
    volume_remaining_pct: volumePct,
    shield_context_text: (() => {
      const tier = shieldTierFromVolumePct(volumePct);
      return tier ? formatShieldPayloadText(tier, remainingKwh) : null;
    })(),
    // Brand-safety requirement: completely eliminate TTE/hour countdown logic.
    hours_remaining: null,
    hours_remaining_low: null,
    hours_remaining_high: null,
    estimated_depletion_at: null,
    alert_state: alertState,
    burn_confidence: daily.confidence,
    daily_spend_source: daily.source,
    needs_daily_spend_setup: daily.source !== "user" && daily.confidence === "low",
  };
}

export function buildMeterProjection(
  meter: VolumeMeterInput,
  purchases: VolumePurchaseRow[],
  lastPurchaseAt: string,
  lastPurchaseAmountKobo: number,
  now = new Date(),
) {
  const volume = buildVolumeMeterProjection(
    meter,
    purchases,
    lastPurchaseAt,
    lastPurchaseAmountKobo,
    now,
  );

  if (volume) {
    return {
      learned_daily_spend_kobo: learnDailySpendFromPurchases(purchases),
      learned_daily_kwh: volume.learned_daily_kwh,
      last_purchase_total_kwh: volume.last_purchase_total_kwh,
      estimated_depletion_at: volume.estimated_depletion_at,
      capacity_remaining_pct: volume.capacity_remaining_pct,
      alert_state: volume.alert_state,
      burn_confidence: volume.burn_confidence,
      daily_spend_source: volume.daily_spend_source,
      needs_daily_spend_setup: volume.needs_daily_spend_setup,
    };
  }

  return {
    learned_daily_spend_kobo: learnDailySpendFromPurchases(purchases),
    learned_daily_kwh: null,
    last_purchase_total_kwh: null,
    estimated_depletion_at: null,
    capacity_remaining_pct: null,
    alert_state: "unknown",
    burn_confidence: "low",
    daily_spend_source: "inferred_default",
    needs_daily_spend_setup: true,
  };
}
