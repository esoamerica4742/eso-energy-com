/**
 * Eso Pay Bills — wallet & prepaid token threshold calculations.
 * Uses historical facility consumption to estimate runway and 10% / 5% tiers.
 */

import {
  CAPACITY_CRITICAL_THRESHOLD_PCT,
  CAPACITY_WARN_THRESHOLD_PCT,
  classifyCapacityAlertLevel,
  computeRemainingKobo,
  effectiveDailySpendKobo,
  pickCapacityAlertTier,
  resolveDailySpend,
  type PowerShieldAlertLevel,
  type PowerShieldAlertTier,
  type PurchaseRow,
} from "./powerShieldEngine.ts";
import {
  buildVolumeMeterProjection,
  type VolumeMeterInput,
  type VolumePurchaseRow,
} from "./volumeThresholdEngine.ts";

export {
  CAPACITY_CRITICAL_THRESHOLD_PCT,
  CAPACITY_WARN_THRESHOLD_PCT,
  classifyCapacityAlertLevel,
  pickCapacityAlertTier,
};

/** Recommended wallet cover (days of facility burn at historical rate). */
export const WALLET_RESERVE_DAYS = 7;

export type ThresholdChannel = "wallet" | "token_reserve";

export type WalletThresholdMeterInput = VolumeMeterInput & {
  last_purchase_amount_kobo?: number | null;
  last_purchase_at?: string | null;
  notify_warn_10?: boolean;
  notify_critical_5?: boolean;
  last_alert_warn_10_at?: string | null;
  last_alert_critical_5_at?: string | null;
};

export type WalletThresholdEvaluation = {
  channel: ThresholdChannel;
  capacityPct: number | null;
  volumePct: number | null;
  level: PowerShieldAlertLevel;
  tier: PowerShieldAlertTier | null;
  dailySpendKobo: number;
  remainingKobo: number | null;
  remainingKwh?: number | null;
  batchTotalKwh?: number | null;
  shieldContextText?: string | null;
  reserveTargetKobo?: number;
  walletBalanceKobo?: number;
};

export function computeWalletReserveTargetKobo(
  dailySpendKobo: number,
  reserveDays = WALLET_RESERVE_DAYS,
): number {
  return Math.max(3_000, Math.round(dailySpendKobo * reserveDays));
}

/** Wallet balance as % of recommended reserve (7-day historical burn). */
export function computeWalletReservePct(
  walletBalanceKobo: number,
  dailySpendKobo: number,
  reserveDays = WALLET_RESERVE_DAYS,
): number | null {
  const target = computeWalletReserveTargetKobo(dailySpendKobo, reserveDays);
  if (target <= 0) return null;
  return Math.min(100, Math.max(0, (walletBalanceKobo / target) * 100));
}

export function aggregateFacilityDailySpendKobo(
  meters: WalletThresholdMeterInput[],
  purchasesByMeter: PurchaseRow[][],
): number {
  if (meters.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < meters.length; i++) {
    const purchases = purchasesByMeter[i] ?? [];
    total += effectiveDailySpendKobo(meters[i], purchases);
  }

  return total;
}

export function evaluateTokenReserveThreshold(
  meter: WalletThresholdMeterInput,
  purchases: PurchaseRow[],
  now = new Date(),
): WalletThresholdEvaluation {
  const spend = resolveDailySpend(meter, purchases);
  const volume = meter.last_purchase_at && meter.last_purchase_amount_kobo
    ? buildVolumeMeterProjection(
      meter,
      purchases as VolumePurchaseRow[],
      meter.last_purchase_at,
      meter.last_purchase_amount_kobo,
      now,
    )
    : null;

  const volumePct = volume?.volume_remaining_pct ?? null;
  const { level } = classifyCapacityAlertLevel(volumePct);
  const tier = pickCapacityAlertTier(
    meter,
    level,
    volumePct,
    now,
  );

  const remainingKobo =
    meter.last_purchase_amount_kobo && meter.last_purchase_at
      ? computeRemainingKobo(
        meter.last_purchase_amount_kobo,
        meter.last_purchase_at,
        spend.dailySpendKobo,
        now,
      )
      : null;

  return {
    channel: "token_reserve",
    capacityPct: volumePct,
    volumePct,
    level,
    tier,
    dailySpendKobo: spend.dailySpendKobo,
    remainingKobo,
    remainingKwh: volume?.remaining_kwh ?? null,
    batchTotalKwh: volume?.batch_total_kwh ?? null,
    shieldContextText: volume?.shield_context_text ?? null,
  };
}

function tierFromAlertLevel(level: PowerShieldAlertLevel): PowerShieldAlertTier | null {
  if (level === "critical") return "critical";
  if (level === "warn_10") return "warn_10";
  return null;
}

export function evaluateWalletBalanceThreshold(
  walletBalanceKobo: number,
  facilityDailySpendKobo: number,
): WalletThresholdEvaluation {
  const capacityPct = computeWalletReservePct(walletBalanceKobo, facilityDailySpendKobo);
  const { level } = classifyCapacityAlertLevel(capacityPct);
  const reserveTargetKobo = computeWalletReserveTargetKobo(facilityDailySpendKobo);

  return {
    channel: "wallet",
    capacityPct,
    level,
    tier: tierFromAlertLevel(level),
    dailySpendKobo: facilityDailySpendKobo,
    remainingKobo: Math.max(0, walletBalanceKobo),
    reserveTargetKobo,
    walletBalanceKobo,
  };
}

export function buildThresholdFingerprint(input: {
  userId: string;
  channel: ThresholdChannel;
  tier: PowerShieldAlertTier;
  meterId?: string | null;
  cycleKey?: string | null;
}): string {
  const cycle = input.cycleKey ?? "default";
  return `${input.userId}:${input.channel}:${input.meterId ?? "wallet"}:${input.tier}:${cycle}`;
}
