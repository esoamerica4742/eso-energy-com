import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Loader2, Radio, ShieldAlert, Square, X } from "lucide-react";
import type { DieselDay } from "./DieselBurden";

/**
 * Hidden developer control bar.
 *
 * Visible when:
 *   • `import.meta.env.DEV` is true, OR
 *   • URL contains `?dev=1`, OR
 *   • `localStorage.aura_dev === "1"`
 *
 * Two actions:
 *   1. "Seed Demo Metrics" — primes React Query caches with a clean snapshot.
 *   2. "Generate Live Demo Stream" — runs a 5-minute inverter simulation,
 *      streaming power_logs, generator_logs, and security_alerts rows into
 *      the in-memory caches at 1s cadence. Random fuel-drop events trigger
 *      a crimson floating banner.
 */

type PowerTick = { ts: number; kw: number; solarKw: number; gridKw: number; battSoc: number };
type GenLog = { ts: number; site: string; runtimeMin: number; litres: number; load: number };
type Alert = {
  id: string;
  severity: "critical" | "warning" | "info";
  site: string;
  code: string;
  message: string;
  at: number;
};

const STREAM_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const TICK_MS = 1000;
const POWER_WINDOW = 60;

export function DevSeeder() {
  const qc = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedFlash, setSeedFlash] = useState(false);

  const [streaming, setStreaming] = useState(false);
  const [elapsed, setElapsed] = useState(0); // ms
  const [latestAlert, setLatestAlert] = useState<Alert | null>(null);

  const tickRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const powerBufRef = useRef<PowerTick[]>([]);
  const genBufRef = useRef<GenLog[]>([]);
  const alertBufRef = useRef<Alert[]>([]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const enabled =
      import.meta.env.DEV ||
      url.searchParams.get("dev") === "1" ||
      localStorage.getItem("aura_dev") === "1";
    setVisible(enabled);
  }, []);

  useEffect(() => () => stopStream(), []); // cleanup on unmount

  if (!visible) return null;

  // ---------------------------------------------------------------------------
  // Seed (snapshot)
  // ---------------------------------------------------------------------------
  const handleSeed = async () => {
    setSeeding(true);
    await new Promise((r) => setTimeout(r, 350));

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

    const now = Date.now();
    qc.setQueryData(
      ["power-logs", "live"],
      Array.from({ length: POWER_WINDOW }, (_, i) => ({
        ts: now - (POWER_WINDOW - i) * 1000,
        kw: 380 + Math.sin(i / 4) * 22 + Math.random() * 6,
        solarKw: 410 + Math.sin(i / 5) * 18,
        gridKw: 0,
        battSoc: 89,
      })),
    );

    qc.setQueryData(["generator-logs", "today"], []);
    qc.setQueryData(["security-alerts", "active"], []);

    await qc.invalidateQueries({ queryKey: ["diesel-burden"] });
    setSeeding(false);
    setSeedFlash(true);
    window.setTimeout(() => setSeedFlash(false), 1400);
  };

  // ---------------------------------------------------------------------------
  // Live stream
  // ---------------------------------------------------------------------------
  const sites = ["Lekki Hub", "Ikeja HQ", "Abuja Annex", "Victoria Island"];
  const pickSite = () => sites[Math.floor(Math.random() * sites.length)];

  const startStream = () => {
    if (streaming) return;
    setStreaming(true);
    setElapsed(0);
    powerBufRef.current = [];
    genBufRef.current = [];
    alertBufRef.current = [];
    startRef.current = Date.now();

    tickRef.current = window.setInterval(() => {
      const t = Date.now();
      const dt = t - startRef.current;
      setElapsed(dt);

      // 1. Power log tick — rolling window of POWER_WINDOW samples.
      const phase = dt / 1000 / 6;
      const sample: PowerTick = {
        ts: t,
        kw: 380 + Math.sin(phase) * 28 + (Math.random() - 0.5) * 10,
        solarKw: 410 + Math.sin(phase + 1) * 22 + (Math.random() - 0.5) * 6,
        gridKw: Math.max(0, 12 + Math.sin(phase / 2) * 8),
        battSoc: 88 + Math.sin(phase / 3) * 4,
      };
      powerBufRef.current = [...powerBufRef.current.slice(-(POWER_WINDOW - 1)), sample];
      qc.setQueryData(["power-logs", "live"], powerBufRef.current);

      // 2. Generator log — every ~20s, simulate a runtime entry.
      if (Math.random() < 1 / 20) {
        const gen: GenLog = {
          ts: t,
          site: pickSite(),
          runtimeMin: Math.round(8 + Math.random() * 14),
          litres: +(2.4 + Math.random() * 5.6).toFixed(2),
          load: Math.round(40 + Math.random() * 50),
        };
        genBufRef.current = [gen, ...genBufRef.current].slice(0, 24);
        qc.setQueryData(["generator-logs", "today"], genBufRef.current);
      }

      // 3. Security alerts — rare crimson fuel-drop events (~3% / tick).
      if (Math.random() < 0.03) {
        const isFuelDrop = Math.random() < 0.55;
        const alert: Alert = isFuelDrop
          ? {
              id: `alrt-${t}`,
              severity: "critical",
              site: pickSite(),
              code: "FUEL_DROP_ANOMALY",
              message: `Unauthorised ${Math.round(8 + Math.random() * 22)}L fuel drop detected while asset offline.`,
              at: t,
            }
          : {
              id: `alrt-${t}`,
              severity: "warning",
              site: pickSite(),
              code: "WIRING_AUDIT_PENDING",
              message: "Installer hardware checksum awaiting re-verification.",
              at: t,
            };
        alertBufRef.current = [alert, ...alertBufRef.current].slice(0, 12);
        qc.setQueryData(["security-alerts", "active"], alertBufRef.current);

        if (alert.severity === "critical") {
          setLatestAlert(alert);
          window.setTimeout(
            () => setLatestAlert((a) => (a?.id === alert.id ? null : a)),
            8000,
          );
        }
      }

      // Bridge for any component that wants to react without subscribing to caches.
      window.dispatchEvent(new CustomEvent("aura:tick", { detail: sample }));

      if (dt >= STREAM_DURATION_MS) stopStream();
    }, TICK_MS);
  };

  const stopStream = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setStreaming(false);
  };

  const progress = Math.min(1, elapsed / STREAM_DURATION_MS);
  const mm = String(Math.floor(elapsed / 60000)).padStart(2, "0");
  const ss = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0");

  return (
    <>
      {/* Crimson floating banner for fuel-drop events */}
      {latestAlert && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] hairline rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.20 0.08 25 / 0.85), oklch(0.14 0.02 265 / 0.92))",
            boxShadow:
              "0 0 0 1px oklch(0.66 0.24 25 / 0.55), 0 20px 60px -10px oklch(0.66 0.24 25 / 0.45)",
            maxWidth: "min(560px, calc(100vw - 2rem))",
          }}
        >
          <span className="pulse-alert h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.24_25)] shrink-0" />
          <ShieldAlert className="h-4 w-4 text-[oklch(0.85_0.18_25)] shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.22em] uppercase font-semibold text-[oklch(0.88_0.16_25)]">
              {latestAlert.code} · {latestAlert.site}
            </p>
            <p className="text-xs text-[oklch(0.92_0.05_25)] mt-0.5 truncate">
              {latestAlert.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLatestAlert(null)}
            aria-label="Dismiss alert"
            className="text-[oklch(0.85_0.18_25)] hover:text-white transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Dev control bar */}
      <div
        role="toolbar"
        aria-label="Developer control bar"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 hairline rounded-full backdrop-blur-xl flex items-center gap-1 p-1 pl-3 opacity-60 hover:opacity-100 transition-opacity"
        style={{
          background: "oklch(0.10 0.02 265 / 0.78)",
          boxShadow:
            "0 0 0 1px oklch(0.30 0.03 265 / 0.6), 0 20px 50px -20px oklch(0 0 0 / 0.7)",
          maxWidth: "calc(100vw - 1.5rem)",
        }}
      >
        <span className="text-[9px] tracking-[0.28em] uppercase text-silver/70 hidden sm:inline">
          Dev
        </span>
        <span className="hidden sm:inline h-3 w-px bg-[oklch(0.30_0.03_265)] mx-1" />

        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding || streaming}
          aria-label="Seed Demo Metrics"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase text-silver/80 hover:text-[oklch(0.92_0.14_165)] hover:bg-[oklch(0.74_0.17_165_/_0.08)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            seedFlash
              ? {
                  boxShadow:
                    "0 0 0 1px oklch(0.74 0.17 165 / 0.7), 0 0 30px oklch(0.74 0.17 165 / 0.5)",
                  color: "oklch(0.92 0.14 165)",
                }
              : undefined
          }
        >
          {seeding ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
          <span className="hidden md:inline">{seeding ? "Seeding…" : seedFlash ? "Seeded" : "Seed"}</span>
        </button>

        {streaming ? (
          <button
            type="button"
            onClick={stopStream}
            aria-label="Stop demo stream"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase text-[oklch(0.88_0.16_25)] hover:bg-[oklch(0.66_0.24_25_/_0.12)] transition-all"
            style={{
              boxShadow: "0 0 0 1px oklch(0.66 0.24 25 / 0.45)",
            }}
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop · {mm}:{ss}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startStream}
            aria-label="Generate Live Demo Stream"
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] tracking-[0.2em] uppercase font-semibold transition-all"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.78 0.17 165 / 0.22), oklch(0.74 0.13 215 / 0.22))",
              color: "oklch(0.92 0.14 165)",
              boxShadow:
                "0 0 0 1px oklch(0.74 0.17 165 / 0.45), 0 0 24px -4px oklch(0.74 0.17 165 / 0.4)",
            }}
          >
            <Radio className="h-3 w-3" />
            <span>Generate Live Stream</span>
          </button>
        )}

        {/* Stream progress bar */}
        {streaming && (
          <div
            className="ml-1 h-1 w-16 sm:w-24 rounded-full overflow-hidden bg-[oklch(0.22_0.02_265)]"
            aria-label={`Stream progress ${Math.round(progress * 100)}%`}
          >
            <div
              className="h-full transition-[width] duration-1000 ease-linear"
              style={{
                width: `${progress * 100}%`,
                background:
                  "linear-gradient(90deg, oklch(0.74 0.17 165), oklch(0.74 0.13 215))",
                boxShadow: "0 0 12px oklch(0.74 0.17 165 / 0.6)",
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
