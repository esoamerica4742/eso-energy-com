import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Loader2 } from "lucide-react";
import type { DieselDay } from "./DieselBurden";

/**
 * Hidden developer-only seeder.
 *
 * Visible when:
 *   • `import.meta.env.DEV` is true, OR
 *   • URL contains `?dev=1`, OR
 *   • `localStorage.aura_dev === "1"`
 *
 * On click it primes the in-memory React Query caches that drive the
 * dashboard animations (Diesel Burden line bars, particle flow pulse,
 * crimson Theft Auditor banner) with a fresh, deterministic mock set —
 * no Supabase round-trip required.
 */
export function DevSeeder() {
  const qc = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const enabled =
      import.meta.env.DEV ||
      url.searchParams.get("dev") === "1" ||
      localStorage.getItem("aura_dev") === "1";
    setVisible(enabled);
  }, []);

  if (!visible) return null;

  const handleSeed = async () => {
    setSeeding(true);

    // Simulate a tiny network blip so the loading state is perceptible.
    await new Promise((r) => setTimeout(r, 450));

    // 1. Diesel Burden — clean 7-day regression curve.
    const week: DieselDay[] = [
      { d: "MON", v: 224 },
      { d: "TUE", v: 251 },
      { d: "WED", v: 268 },
      { d: "THU", v: 247 },
      { d: "FRI", v: 286 },
      { d: "SAT", v: 273 },
      { d: "SUN", v: 291 },
    ];
    qc.setQueryData(["diesel-burden", "week"], week);

    // 2. Power logs (mock channel for the EnergyFlow line graph).
    const now = Date.now();
    qc.setQueryData(
      ["power-logs", "live"],
      Array.from({ length: 60 }, (_, i) => ({
        ts: now - (60 - i) * 1000,
        kw: 380 + Math.sin(i / 4) * 22 + Math.random() * 6,
      })),
    );

    // 3. Security alerts (mock crimson banners).
    qc.setQueryData(
      ["security-alerts", "active"],
      [
        {
          id: "alrt-2271",
          severity: "critical",
          site: "Lekki Hub",
          code: "FUEL_DROP_ANOMALY",
          message: "12L volume drop detected while asset offline.",
          at: now - 1000 * 60 * 4,
        },
        {
          id: "alrt-2270",
          severity: "warning",
          site: "Ikeja HQ",
          code: "WIRING_AUDIT_PENDING",
          message: "Installer hardware checksum awaiting re-verification.",
          at: now - 1000 * 60 * 18,
        },
      ],
    );

    // Force any subscribed queries to re-render with the new payload.
    await qc.invalidateQueries({ queryKey: ["diesel-burden"] });

    setSeeding(false);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleSeed}
      disabled={seeding}
      aria-label="Seed Demo Metrics (developer only)"
      title="Seed Demo Metrics — dev only"
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-1.5 rounded-full hairline px-3 py-1.5 text-[10px] tracking-[0.22em] uppercase text-silver/70 hover:text-[oklch(0.92_0.14_165)] hover:bg-[oklch(0.74_0.17_165_/_0.08)] backdrop-blur-md transition-all opacity-40 hover:opacity-100 disabled:cursor-wait"
      style={{
        background: "oklch(0.10 0.02 265 / 0.7)",
        boxShadow: flash
          ? "0 0 0 1px oklch(0.74 0.17 165 / 0.7), 0 0 30px oklch(0.74 0.17 165 / 0.55)"
          : undefined,
      }}
    >
      {seeding ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <FlaskConical className="h-3 w-3" />
      )}
      {seeding ? "Seeding…" : flash ? "Seeded ✓" : "Seed Demo Metrics"}
    </button>
  );
}
