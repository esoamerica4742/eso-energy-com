import { useEffect, useRef, useState } from "react";
import { FlaskConical, Loader2, Radio, ShieldAlert, Square, X } from "lucide-react";
import { supabase, ENTERPRISE_CLIENT_ID } from "@/integrations/supabase/client";

/**
 * Hidden developer control bar.
 *
 * Both buttons issue REAL Supabase INSERTs against the enterprise client's
 * facilities (auto-provisioning a default "Ikeja Corporate HQ" if none exist).
 *
 *   • "Seed" — backfills 7 days of power_logs (one per facility per day).
 *   • "Generate Live Stream" — runs a 5-minute live insert loop (~1 row / 2s),
 *     occasionally injecting security_alerts. Realtime subscriptions push the
 *     new rows back into the dashboard with no refresh.
 */

const STREAM_DURATION_MS = 5 * 60 * 1000;
const TICK_MS = 2000;

const SITES = [
  { facility_name: "Ikeja Corporate HQ", location_state: "Lagos", status: "online" },
  { facility_name: "Lekki Premium Terminal", location_state: "Lagos", status: "online" },
  { facility_name: "Abuja Operations Annex", location_state: "FCT", status: "online" },
];

const ALERT_TYPES = [
  { type: "FUEL_DROP_ANOMALY", severity: "critical", msg: (l: number) => `Unauthorised ${l}L fuel drop while asset offline.` },
  { type: "WIRING_AUDIT_PENDING", severity: "warning", msg: () => "Installer hardware checksum awaiting re-verification." },
  { type: "PERIMETER_HANDSHAKE", severity: "info", msg: () => "Perimeter sensor handshake verified." },
];

async function ensureFacilities(): Promise<string[]> {
  const { data, error } = await supabase
    .from("facilities")
    .select("id")
    .eq("client_id", ENTERPRISE_CLIENT_ID);
  if (error) throw error;
  if (data && data.length > 0) return data.map((d: { id: string }) => d.id);

  const { data: inserted, error: insErr } = await supabase
    .from("facilities")
    .insert(SITES.map((s) => ({ ...s, client_id: ENTERPRISE_CLIENT_ID })))
    .select("id");
  if (insErr) throw insErr;
  return (inserted ?? []).map((d: { id: string }) => d.id);
}

function powerSample(facilityId: string, when: Date) {
  const phase = (when.getHours() + when.getMinutes() / 60 - 6) / 12; // 0 at 6am, peak midday
  const dayBoost = Math.max(0, Math.sin(phase * Math.PI));
  const solar = +(380 * dayBoost + Math.random() * 40).toFixed(2);
  const load = +(290 + Math.random() * 80).toFixed(2);
  const battery = Math.round(70 + Math.random() * 25);
  const battTemp = +(28 + Math.random() * 6).toFixed(1);
  const grid = solar > load ? "online" : Math.random() < 0.15 ? "diesel" : "online";
  // Naira saved = liters not burned * ₦1180 (rough heuristic from solar contribution).
  const litersAvoided = Math.max(0, Math.min(solar, load)) * 0.25;
  const naira = Math.round(litersAvoided * 1180);
  return {
    facility_id: facilityId,
    solar_generation_kw: solar,
    load_consumption_kw: load,
    battery_percentage: battery,
    battery_temperature_c: battTemp,
    grid_status: grid,
    diesel_saved_naira: naira,
    logged_at: when.toISOString(),
  };
}

export function DevSeeder() {
  const [visible, setVisible] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedFlash, setSeedFlash] = useState(false);

  const [streaming, setStreaming] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [latestAlert, setLatestAlert] = useState<{ id: string; site: string; code: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tickRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const facilityIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const enabled = import.meta.env.DEV || url.searchParams.get("dev") === "1" || localStorage.getItem("aura_dev") === "1";
    setVisible(enabled);
  }, []);

  useEffect(() => () => stopStream(), []);

  if (!visible) return null;

  // ---------------------------------------------------------------------------
  // Seed — backfill 7 days of power_logs.
  // ---------------------------------------------------------------------------
  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      const ids = await ensureFacilities();
      const rows = [];
      const now = new Date();
      for (let d = 6; d >= 0; d--) {
        for (const id of ids) {
          for (let h = 6; h <= 18; h += 4) {
            const when = new Date(now);
            when.setDate(now.getDate() - d);
            when.setHours(h, Math.floor(Math.random() * 60), 0, 0);
            rows.push(powerSample(id, when));
          }
        }
      }
      const { error: insErr } = await supabase.from("power_logs").insert(rows);
      if (insErr) throw insErr;
      setSeedFlash(true);
      window.setTimeout(() => setSeedFlash(false), 1400);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Live stream — INSERT a row every TICK_MS into a random facility.
  // ---------------------------------------------------------------------------
  const startStream = async () => {
    if (streaming) return;
    setError(null);
    try {
      facilityIdsRef.current = await ensureFacilities();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not provision facilities");
      return;
    }
    setStreaming(true);
    setElapsed(0);
    startRef.current = Date.now();

    tickRef.current = window.setInterval(async () => {
      const now = Date.now();
      const dt = now - startRef.current;
      setElapsed(dt);

      const ids = facilityIdsRef.current;
      const fid = ids[Math.floor(Math.random() * ids.length)];
      try {
        await supabase.from("power_logs").insert(powerSample(fid, new Date()));
      } catch {
        // Realtime subscription will fall behind quietly; surface in error chip.
      }

      // Random alert ~5% per tick.
      if (Math.random() < 0.05) {
        const def = ALERT_TYPES[Math.floor(Math.random() * ALERT_TYPES.length)];
        const liters = Math.round(8 + Math.random() * 22);
        const message = def.msg(liters);
        const alertRow = {
          facility_id: fid,
          alert_type: def.type,
          message,
          severity: def.severity,
          is_resolved: false,
        };
        try {
          await supabase.from("security_alerts").insert(alertRow);
          if (def.severity === "critical") {
            const banner = { id: `${now}`, site: "AURA Mesh", code: def.type, message };
            setLatestAlert(banner);
            window.setTimeout(() => setLatestAlert((a) => (a?.id === banner.id ? null : a)), 8000);
          }
        } catch {
          // ignore
        }
      }

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
      {latestAlert && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] hairline rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2"
          style={{
            background: "linear-gradient(135deg, oklch(0.20 0.08 25 / 0.85), oklch(0.14 0.02 265 / 0.92))",
            boxShadow: "0 0 0 1px oklch(0.66 0.24 25 / 0.55), 0 20px 60px -10px oklch(0.66 0.24 25 / 0.45)",
            maxWidth: "min(560px, calc(100vw - 2rem))",
          }}
        >
          <span className="pulse-alert h-2.5 w-2.5 rounded-full bg-[oklch(0.7_0.24_25)] shrink-0" />
          <ShieldAlert className="h-4 w-4 text-[oklch(0.85_0.18_25)] shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.22em] uppercase font-semibold text-[oklch(0.88_0.16_25)]">
              {latestAlert.code} · {latestAlert.site}
            </p>
            <p className="text-xs text-[oklch(0.92_0.05_25)] mt-0.5 truncate">{latestAlert.message}</p>
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

      {error && (
        <div
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 hairline rounded-md px-3 py-2 text-[11px] text-[oklch(0.85_0.18_25)] backdrop-blur-md"
          style={{ background: "oklch(0.20 0.08 25 / 0.85)", maxWidth: "min(520px, calc(100vw - 2rem))" }}
        >
          {error}
        </div>
      )}

      <div
        role="toolbar"
        aria-label="Developer control bar"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 hairline rounded-full backdrop-blur-xl flex items-center gap-1 p-1 pl-3 opacity-60 hover:opacity-100 transition-opacity"
        style={{
          background: "oklch(0.10 0.02 265 / 0.78)",
          boxShadow: "0 0 0 1px oklch(0.30 0.03 265 / 0.6), 0 20px 50px -20px oklch(0 0 0 / 0.7)",
          maxWidth: "calc(100vw - 1.5rem)",
        }}
      >
        <span className="text-[9px] tracking-[0.28em] uppercase text-silver/70 hidden sm:inline">Dev</span>
        <span className="hidden sm:inline h-3 w-px bg-[oklch(0.30_0.03_265)] mx-1" />

        <button
          type="button"
          onClick={handleSeed}
          disabled={seeding || streaming}
          aria-label="Seed historical power logs"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase text-silver/80 hover:text-[oklch(0.92_0.14_165)] hover:bg-[oklch(0.74_0.17_165_/_0.08)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            seedFlash
              ? {
                  boxShadow: "0 0 0 1px oklch(0.74 0.17 165 / 0.7), 0 0 30px oklch(0.74 0.17 165 / 0.5)",
                  color: "oklch(0.92 0.14 165)",
                }
              : undefined
          }
        >
          {seeding ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
          <span className="hidden md:inline">{seeding ? "Seeding…" : seedFlash ? "Seeded" : "Seed 7d"}</span>
        </button>

        {streaming ? (
          <button
            type="button"
            onClick={stopStream}
            aria-label="Stop live insert stream"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase text-[oklch(0.88_0.16_25)] hover:bg-[oklch(0.66_0.24_25_/_0.12)] transition-all"
            style={{ boxShadow: "0 0 0 1px oklch(0.66 0.24 25 / 0.45)" }}
          >
            <Square className="h-3 w-3 fill-current" />
            <span>
              Stop · {mm}:{ss}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startStream}
            aria-label="Generate live insert stream"
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] tracking-[0.2em] uppercase font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, oklch(0.78 0.17 165 / 0.22), oklch(0.74 0.13 215 / 0.22))",
              color: "oklch(0.92 0.14 165)",
              boxShadow: "0 0 0 1px oklch(0.74 0.17 165 / 0.45), 0 0 24px -4px oklch(0.74 0.17 165 / 0.4)",
            }}
          >
            <Radio className="h-3 w-3" />
            <span>Generate Live Stream</span>
          </button>
        )}

        {streaming && (
          <div
            className="ml-1 h-1 w-16 sm:w-24 rounded-full overflow-hidden bg-[oklch(0.22_0.02_265)]"
            aria-label={`Stream progress ${Math.round(progress * 100)}%`}
          >
            <div
              className="h-full transition-[width] duration-1000 ease-linear"
              style={{
                width: `${progress * 100}%`,
                background: "linear-gradient(90deg, oklch(0.74 0.17 165), oklch(0.74 0.13 215))",
                boxShadow: "0 0 12px oklch(0.74 0.17 165 / 0.6)",
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
