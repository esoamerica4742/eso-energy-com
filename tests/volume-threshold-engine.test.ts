import { describe, expect, it } from "vitest";
import {
  CAPACITY_CRITICAL_THRESHOLD_PCT,
  CAPACITY_WARN_THRESHOLD_PCT,
  buildVolumeMeterProjection,
  computeRemainingKwh,
  computeVolumeRemainingPct,
  formatShieldContextText,
  inferBatchKwhFromAmount,
  parseKwhFromTokenReceipt,
  resolveBatchTotalKwh,
} from "../supabase/functions/_shared/volumeThresholdEngine.ts";

describe("parseKwhFromTokenReceipt", () => {
  it("reads kWh from plain text", () => {
    expect(parseKwhFromTokenReceipt("Token OK · 42.5 kWh credited")).toBe(42.5);
  });

  it("reads units from JSON payload", () => {
    expect(parseKwhFromTokenReceipt(JSON.stringify({ units: 18 }))).toBe(18);
  });
});

describe("batch total kWh", () => {
  it("prefers parsed token over tariff inference", () => {
    const total = resolveBatchTotalKwh({
      amountKobo: 10_000_00,
      tokenOrReceipt: "Units: 120",
    });
    expect(total).toBe(120);
  });

  it("infers from amount when token has no units", () => {
    const total = inferBatchKwhFromAmount(6_500_00, 65);
    expect(total).toBe(100);
  });
});

describe("volume remaining thresholds", () => {
  const batchKwh = 100;
  const dailyKwh = 5;
  const lastPurchaseAt = new Date(Date.now() - 18 * 86_400_000).toISOString();

  it("fires warn at 10% of batch", () => {
    const remaining = computeRemainingKwh(batchKwh, lastPurchaseAt, dailyKwh);
    const pct = computeVolumeRemainingPct(batchKwh, remaining)!;
    expect(pct).toBeLessThanOrEqual(CAPACITY_WARN_THRESHOLD_PCT + 1);
  });

  it("fires critical at 5% of batch", () => {
    const lastAt = new Date(Date.now() - 19.2 * 86_400_000).toISOString();
    const remaining = computeRemainingKwh(batchKwh, lastAt, dailyKwh);
    const pct = computeVolumeRemainingPct(batchKwh, remaining)!;
    expect(pct).toBeLessThanOrEqual(CAPACITY_CRITICAL_THRESHOLD_PCT + 0.5);
  });
});

describe("shield context text", () => {
  it("formats 5% critical Power Shield payload", () => {
    const text = formatShieldContextText(5, 12.4, 2.5);
    expect(text).toBe(
      "Power Shield: 5% Remaining (Approx. 12.4 kWh left. Tap to top up immediately.)",
    );
  });
});

describe("buildVolumeMeterProjection", () => {
  it("returns volume pct and critical shield copy below 5%", () => {
    const lastPurchaseAt = new Date(Date.now() - 19.5 * 86_400_000).toISOString();
    const projection = buildVolumeMeterProjection(
      { daily_spend_kobo: null, learned_daily_spend_kobo: null, user_daily_kwh: 5 },
      [{
        amount_kobo: 6_500_00,
        completed_at: lastPurchaseAt,
        created_at: lastPurchaseAt,
        token_or_receipt: "100 kWh",
      }],
      lastPurchaseAt,
      6_500_00,
    );
    expect(projection).not.toBeNull();
    expect(projection!.batch_total_kwh).toBe(100);
    expect(projection!.shield_context_text).toContain("Power Shield: 5% Remaining");
    expect(projection!.volume_remaining_pct).not.toBeNull();
    expect(projection!.volume_remaining_pct!).toBeLessThanOrEqual(5);
  });
});
