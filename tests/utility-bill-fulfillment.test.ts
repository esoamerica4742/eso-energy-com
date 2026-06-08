import { describe, expect, it } from "vitest";
import {
  isDiscoDowntimeError,
  isRetryableGatewayStatus,
  normalizePayBillError,
  UtilityBillPayError,
} from "../supabase/functions/_shared/utilityBillFulfillmentCore.ts";

describe("isRetryableGatewayStatus", () => {
  it("treats 504 as retryable", () => {
    expect(isRetryableGatewayStatus(504)).toBe(true);
  });

  it("ignores 400", () => {
    expect(isRetryableGatewayStatus(400)).toBe(false);
  });
});

describe("isDiscoDowntimeError", () => {
  it("detects gateway timeout errors", () => {
    const err = new UtilityBillPayError("Gateway timeout", { httpStatus: 504, discoDowntime: true });
    expect(isDiscoDowntimeError(err)).toBe(true);
  });

  it("detects timeout message text", () => {
    expect(isDiscoDowntimeError(new Error("The request timed out"))).toBe(true);
  });
});

describe("normalizePayBillError", () => {
  it("marks 504 as disco downtime", () => {
    const raw = new Error("Monnify request failed (504)") as Error & { httpStatus?: number };
    raw.httpStatus = 504;
    const normalized = normalizePayBillError(raw);
    expect(normalized.discoDowntime).toBe(true);
    expect(normalized.retryable).toBe(true);
  });
});
