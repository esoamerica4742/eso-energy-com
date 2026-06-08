import { describe, expect, it } from "vitest";
import {
  AUTO_TOP_UP_COOLDOWN_MS,
  CAPACITY_CRITICAL_THRESHOLD_PCT,
  CAPACITY_WARN_THRESHOLD_PCT,
  buildMeterProjection,
  classifyCapacityAlertLevel,
  computeCapacityRemainingPct,
  computeRemainingKobo,
  estimateDailySpendFromSinglePurchase,
  learnDailySpendFromPurchases,
  pickCapacityAlertTier,
} from "../supabase/functions/_shared/powerShieldEngine.ts";

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

describe("learnDailySpendFromPurchases", () => {
  it("weights recent intervals higher", () => {
    const purchases = [
      { amount_kobo: 100_000, completed_at: day(-60), created_at: day(-60) },
      { amount_kobo: 200_000, completed_at: day(-30), created_at: day(-30) },
      { amount_kobo: 300_000, completed_at: day(-1), created_at: day(-1) },
    ];
    const learned = learnDailySpendFromPurchases(purchases);
    expect(learned).not.toBeNull();
    expect(learned!).toBeGreaterThan(3_000);
  });
});

describe("single purchase estimate", () => {
  it("uses 21-day runway not flat ₦500 default", () => {
    const spend = estimateDailySpendFromSinglePurchase(21_000_00);
    expect(spend).toBe(100_000);
  });
});

describe("capacity thresholds", () => {
  const lastPurchaseAt = new Date(Date.now() - 20 * 86_400_000).toISOString();
  const lastAmount = 100_000;
  const dailySpend = 5_000;

  it("classifies warn at 10% or below", () => {
    const burnedDays = (lastAmount * 0.91) / dailySpend;
    const at = new Date(new Date(lastPurchaseAt).getTime() + burnedDays * 86_400_000);
    const pct = computeCapacityRemainingPct(lastAmount, lastPurchaseAt, dailySpend, at);
    expect(pct).not.toBeNull();
    expect(pct!).toBeLessThanOrEqual(CAPACITY_WARN_THRESHOLD_PCT + 1);
    expect(classifyCapacityAlertLevel(pct).level).toBe("warn_10");
  });

  it("classifies critical at 5% or below", () => {
    const burnedDays = (lastAmount * 0.96) / dailySpend;
    const at = new Date(new Date(lastPurchaseAt).getTime() + burnedDays * 86_400_000);
    const pct = computeCapacityRemainingPct(lastAmount, lastPurchaseAt, dailySpend, at);
    expect(pct).not.toBeNull();
    expect(pct!).toBeLessThanOrEqual(CAPACITY_CRITICAL_THRESHOLD_PCT + 0.5);
    expect(classifyCapacityAlertLevel(pct).level).toBe("critical");
  });

  it("picks critical tier before warn when both thresholds crossed", () => {
    const pct = 4;
    const tier = pickCapacityAlertTier(
      {
        notify_warn_10: true,
        notify_critical_5: true,
        last_purchase_at: lastPurchaseAt,
      },
      "critical",
      pct,
    );
    expect(tier).toBe("critical");
  });

  it("does not re-fire warn alert for same purchase cycle", () => {
    const tier = pickCapacityAlertTier(
      {
        notify_warn_10: true,
        last_alert_warn_10_at: new Date().toISOString(),
        last_purchase_at: day(-5),
      },
      "warn_10",
      9,
    );
    expect(tier).toBeNull();
  });
});

describe("buildMeterProjection", () => {
  it("returns capacity pct and alert state", () => {
    const lastPurchaseAt = day(-10);
    const projection = buildMeterProjection(
      { daily_spend_kobo: 10_000, learned_daily_spend_kobo: null },
      [{ amount_kobo: 200_000, completed_at: lastPurchaseAt, created_at: lastPurchaseAt }],
      lastPurchaseAt,
      200_000,
    );
    expect(projection.capacity_remaining_pct).not.toBeNull();
    expect(["safe", "warn_10", "critical", "expired"]).toContain(projection.alert_state);
    // Brand-safety: volume engine should not expose time-to-empty fields.
    expect(projection.estimated_depletion_at).toBeNull();
  });
});

describe("remaining kobo", () => {
  it("decreases with elapsed days", () => {
    const lastAt = day(-5);
    const early = computeRemainingKobo(100_000, lastAt, 10_000, new Date());
    const later = computeRemainingKobo(
      100_000,
      lastAt,
      10_000,
      new Date(Date.now() + 2 * 86_400_000),
    );
    expect(later).toBeLessThan(early);
  });
});

describe("auto top-up cooldown", () => {
  it("is five minutes", () => {
    expect(AUTO_TOP_UP_COOLDOWN_MS).toBe(5 * 60 * 1000);
  });
});
