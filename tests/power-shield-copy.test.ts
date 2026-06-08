import { describe, expect, it } from "vitest";
import {
  formatShieldPayloadText,
  shieldTierFromVolumePct,
} from "../supabase/functions/_shared/powerShieldCopy.ts";

describe("formatShieldPayloadText", () => {
  it("formats 10% warning copy", () => {
    expect(formatShieldPayloadText("warn_10", 18.2)).toBe(
      "Power Shield: 10% Remaining (Approx. 18.2 kWh left. Secure your utility reserve.)",
    );
  });

  it("formats 5% critical copy", () => {
    expect(formatShieldPayloadText("critical", 7)).toBe(
      "Power Shield: 5% Remaining (Approx. 7 kWh left. Tap to top up immediately.)",
    );
  });
});

describe("shieldTierFromVolumePct", () => {
  it("maps volume thresholds", () => {
    expect(shieldTierFromVolumePct(4)).toBe("critical");
    expect(shieldTierFromVolumePct(8)).toBe("warn_10");
    expect(shieldTierFromVolumePct(50)).toBeNull();
  });
});
