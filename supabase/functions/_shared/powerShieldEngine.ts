/**
 * Power Shield v4 — volume-% thresholds (10% warn / 5% critical) against last vend kWh batch.
 * Burn-rate helpers remain for wallet reserve and legacy fallbacks.
 */

export const MS_PER_DAY = 86_400_000;
export const MS_PER_HOUR = 3_600_000;

export const CAPACITY_WARN_THRESHOLD_PCT = 10;
export const CAPACITY_CRITICAL_THRESHOLD_PCT = 5;
export const AUTO_TOP_UP_COOLDOWN_MS = 5 * 60 * 1000;

/** Absolute floor when no purchase history exists (₦30/day). */
export const ABSOLUTE_MIN_DAILY_SPEND_KOBO = 3_000;

/** Legacy flat default — only used if single-purchase inference fails. */
export const LEGACY_DEFAULT_DAILY_SPEND_KOBO = 50_000;

/** Typical days of credit assumed for a first-time top-up estimate. */
export const SINGLE_PURCHASE_ASSUMED_DAYS = 21;

export type PowerShieldAlertLevel =
  | "safe"
  | "warn_10"
  | "critical"
  | "expired"
  | "unknown";

/** Active notification tiers (capacity-based). */
export type PowerShieldAlertTier = "warn_10" | "critical";

export type PowerShieldAlertState =
  | "safe"
  | "warn_10"
  | "critical"
  | "expired"
  | "unknown";

export type BurnConfidence = "high" | "medium" | "low";
export type DailySpendSource = "user" | "learned" | "estimated_single" | "inferred_default";

export type PurchaseRow = {
  amount_kobo: number;
  completed_at: string | null;
  created_at: string;
  token_or_receipt?: string | null;
};

export type MeterSpendInput = {
  daily_spend_kobo: number | null;
  learned_daily_spend_kobo: number | null;
};

export function clampDailySpendKobo(value: number): number {
  return Math.max(ABSOLUTE_MIN_DAILY_SPEND_KOBO, Math.min(Math.round(value), 5_000_000));
}

export function learnDailySpendFromPurchases(purchases: PurchaseRow[]): number | null {
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
    if (days >= 0.5 && days <= 90) {
      const daily = prev.amount_kobo / days;
      const weight = Math.pow(0.82, sorted.length - 1 - i);
      weightedSum += daily * weight;
      weightTotal += weight;
    }
  }

  if (weightTotal === 0) return null;
  return clampDailySpendKobo(weightedSum / weightTotal);
}

export function estimateDailySpendFromSinglePurchase(amountKobo: number): number {
  return clampDailySpendKobo(amountKobo / SINGLE_PURCHASE_ASSUMED_DAYS);
}

export function resolveDailySpend(
  meter: MeterSpendInput,
  purchases: PurchaseRow[],
): { dailySpendKobo: number; source: DailySpendSource; confidence: BurnConfidence } {
  if (meter.daily_spend_kobo && meter.daily_spend_kobo > 0) {
    return {
      dailySpendKobo: clampDailySpendKobo(meter.daily_spend_kobo),
      source: "user",
      confidence: "high",
    };
  }

  const learned = learnDailySpendFromPurchases(purchases);
  if (learned) {
    const confidence: BurnConfidence = purchases.length >= 4 ? "high" : "medium";
    return { dailySpendKobo: learned, source: "learned", confidence };
  }

  if (purchases.length >= 1) {
    const latest = purchases[0];
    return {
      dailySpendKobo: estimateDailySpendFromSinglePurchase(latest.amount_kobo),
      source: "estimated_single",
      confidence: "low",
    };
  }

  return {
    dailySpendKobo: LEGACY_DEFAULT_DAILY_SPEND_KOBO,
    source: "inferred_default",
    confidence: "low",
  };
}

export function effectiveDailySpendKobo(
  meter: MeterSpendInput,
  purchases: PurchaseRow[] = [],
): number {
  return resolveDailySpend(meter, purchases).dailySpendKobo;
}

export function computeRemainingKobo(
  lastPurchaseAmountKobo: number,
  lastPurchaseAt: string,
  dailySpendKobo: number,
  now = new Date(),
): number {
  const daysElapsed = Math.max(
    0,
    (now.getTime() - new Date(lastPurchaseAt).getTime()) / MS_PER_DAY,
  );
  const burned = dailySpendKobo * daysElapsed;
  return Math.max(0, Math.round(lastPurchaseAmountKobo - burned));
}

export function computeCapacityRemainingPct(
  lastPurchaseAmountKobo: number | null,
  lastPurchaseAt: string | null,
  dailySpendKobo: number,
  now = new Date(),
): number | null {
  if (!lastPurchaseAmountKobo || !lastPurchaseAt || lastPurchaseAmountKobo <= 0) {
    return null;
  }
  const remaining = computeRemainingKobo(
    lastPurchaseAmountKobo,
    lastPurchaseAt,
    dailySpendKobo,
    now,
  );
  return Math.min(100, Math.max(0, (remaining / lastPurchaseAmountKobo) * 100));
}

export function computeDepletionAt(
  lastPurchaseAt: string,
  lastPurchaseAmountKobo: number,
  dailySpendKobo: number,
): string {
  const daysRemaining = lastPurchaseAmountKobo / dailySpendKobo;
  const at = new Date(new Date(lastPurchaseAt).getTime() + daysRemaining * MS_PER_DAY);
  return at.toISOString();
}

export function hoursRemainingFromCapacity(
  remainingKobo: number,
  dailySpendKobo: number,
): number | null {
  if (dailySpendKobo <= 0) return null;
  return (remainingKobo / dailySpendKobo) * 24;
}

export function classifyCapacityAlertLevel(
  capacityPct: number | null,
): { level: PowerShieldAlertLevel; alertState: PowerShieldAlertState } {
  if (capacityPct == null || Number.isNaN(capacityPct)) {
    return { level: "unknown", alertState: "unknown" };
  }
  if (capacityPct <= 0) {
    return { level: "expired", alertState: "expired" };
  }
  if (capacityPct <= CAPACITY_CRITICAL_THRESHOLD_PCT) {
    return { level: "critical", alertState: "critical" };
  }
  if (capacityPct <= CAPACITY_WARN_THRESHOLD_PCT) {
    return { level: "warn_10", alertState: "warn_10" };
  }
  return { level: "safe", alertState: "safe" };
}

export function alertAlreadySentForTier(
  meter: {
    last_alert_warn_10_at?: string | null;
    last_alert_critical_5_at?: string | null;
  },
  tier: PowerShieldAlertTier,
  lastPurchaseAt: string | null,
): boolean {
  const sentAt = tier === "warn_10"
    ? meter.last_alert_warn_10_at
    : meter.last_alert_critical_5_at;

  if (!sentAt || !lastPurchaseAt) return false;
  return new Date(sentAt).getTime() >= new Date(lastPurchaseAt).getTime();
}

export function pickCapacityAlertTier(
  meter: {
    notify_warn_10?: boolean;
    notify_critical_5?: boolean;
    last_alert_warn_10_at?: string | null;
    last_alert_critical_5_at?: string | null;
    last_purchase_at?: string | null;
  },
  level: PowerShieldAlertLevel,
  capacityPct: number | null,
  now = new Date(),
): PowerShieldAlertTier | null {
  void now;
  if (capacityPct == null) return null;

  const notifyWarn = meter.notify_warn_10 ?? true;
  const notifyCritical = meter.notify_critical_5 ?? true;
  const lastPurchaseAt = meter.last_purchase_at ?? null;

  if (
    level === "critical" &&
    notifyCritical &&
    !alertAlreadySentForTier(meter, "critical", lastPurchaseAt)
  ) {
    return "critical";
  }

  if (
    level === "warn_10" &&
    notifyWarn &&
    !alertAlreadySentForTier(meter, "warn_10", lastPurchaseAt)
  ) {
    return "warn_10";
  }

  return null;
}

export { buildMeterProjection } from "./volumeThresholdEngine.ts";
