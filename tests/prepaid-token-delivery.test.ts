import { describe, expect, it } from "vitest";
import {
  buildPrepaidTokenSmsBody,
  formatPrepaidTokenDisplay,
  normalizePrepaidTokenDigits,
} from "../supabase/functions/_shared/prepaidTokenDeliveryCore.ts";

describe("prepaid token formatting", () => {
  it("formats 20 digits in five groups", () => {
    expect(formatPrepaidTokenDisplay("12345678901234567890")).toBe(
      "1234-5678-9012-3456-7890",
    );
  });

  it("normalizes non-digit separators", () => {
    expect(normalizePrepaidTokenDigits("1234-5678-9012-3456-7890")).toBe(
      "12345678901234567890",
    );
  });
});

describe("prepaid token SMS", () => {
  it("uses Power Shield copy with meter name and amount", () => {
    const sms = buildPrepaidTokenSmsBody({
      meterName: "Home meter",
      token: "12345678901234567890",
      amountKobo: 5_000_00,
    });
    expect(sms).toContain("Eso Pay: Your prepaid power token for Home meter is:");
    expect(sms).toContain("1234-5678-9012-3456-7890");
    expect(sms).toContain("Amount: ₦5,000");
    expect(sms).toContain("Thank you for using Power Shield!");
  });
});
