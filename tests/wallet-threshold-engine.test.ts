import { describe, expect, it } from "vitest";
import {
  CAPACITY_CRITICAL_THRESHOLD_PCT,
  CAPACITY_WARN_THRESHOLD_PCT,
  aggregateFacilityDailySpendKobo,
  computeWalletReservePct,
  computeWalletReserveTargetKobo,
  evaluateTokenReserveThreshold,
  evaluateWalletBalanceThreshold,
} from "../supabase/functions/_shared/walletThresholdEngine.ts";

describe("wallet reserve thresholds", () => {
  it("targets seven days of facility burn", () => {
    expect(computeWalletReserveTargetKobo(10_000)).toBe(70_000);
  });

  it("classifies wallet warn at 10% reserve", () => {
    const target = computeWalletReserveTargetKobo(10_000);
    const balance = Math.floor(target * 0.09);
    const pct = computeWalletReservePct(balance, 10_000);
    expect(pct).not.toBeNull();
    expect(pct!).toBeLessThanOrEqual(CAPACITY_WARN_THRESHOLD_PCT + 1);
    const evaluation = evaluateWalletBalanceThreshold(balance, 10_000);
    expect(evaluation.tier).toBe("warn_10");
    expect(evaluation.channel).toBe("wallet");
  });

  it("classifies wallet critical at 5% reserve", () => {
    const target = computeWalletReserveTargetKobo(10_000);
    const balance = Math.floor(target * 0.04);
    const evaluation = evaluateWalletBalanceThreshold(balance, 10_000);
    expect(evaluation.tier).toBe("critical");
  });
});

describe("token reserve thresholds", () => {
  const lastPurchaseAt = new Date(Date.now() - 20 * 86_400_000).toISOString();

  it("evaluates prepaid capacity against historical burn", () => {
    const evaluation = evaluateTokenReserveThreshold(
      {
        last_purchase_amount_kobo: 100_000,
        last_purchase_at: lastPurchaseAt,
        notify_warn_10: true,
        notify_critical_5: true,
      },
      [{ amount_kobo: 100_000, completed_at: lastPurchaseAt, created_at: lastPurchaseAt }],
    );
    expect(evaluation.channel).toBe("token_reserve");
    expect(["warn_10", "critical", null]).toContain(evaluation.tier);
  });
});

describe("aggregateFacilityDailySpendKobo", () => {
  it("sums per-meter daily spend", () => {
    const total = aggregateFacilityDailySpendKobo(
      [{ daily_spend_kobo: 5_000 }, { daily_spend_kobo: 3_000 }],
      [[], []],
    );
    expect(total).toBe(8_000);
  });
});

describe("threshold constants", () => {
  it("uses 10% and 5% capacity tiers", () => {
    expect(CAPACITY_WARN_THRESHOLD_PCT).toBe(10);
    expect(CAPACITY_CRITICAL_THRESHOLD_PCT).toBe(5);
  });
});
