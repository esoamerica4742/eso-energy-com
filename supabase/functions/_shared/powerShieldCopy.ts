/**
 * Power Shield alert copy helpers (volume-tier messaging).
 */

export type ShieldAlertTier = "warn_10" | "critical";

export function roundDisplayKwh(kwh: number): number {
  return Math.round(kwh * 10) / 10;
}

/** Power Shield UI / webhook copy at 10% and 5% volume tiers. */
export function formatShieldPayloadText(
  tier: ShieldAlertTier,
  remainingKwh: number,
): string {
  const kwh = roundDisplayKwh(Math.max(0, remainingKwh));
  if (tier === "warn_10") {
    return `Power Shield: 10% Remaining (Approx. ${kwh} kWh left. Secure your utility reserve.)`;
  }
  return `Power Shield: 5% Remaining (Approx. ${kwh} kWh left. Tap to top up immediately.)`;
}

export function shieldTierFromVolumePct(volumePct: number | null): ShieldAlertTier | null {
  if (volumePct == null || Number.isNaN(volumePct)) return null;
  if (volumePct <= 5) return "critical";
  if (volumePct <= 10) return "warn_10";
  return null;
}
