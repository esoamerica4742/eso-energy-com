import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  Plus,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useSim } from "@/lib/sim-store";

type Row = {
  id: string;
  branch: string;
  region: string;
  runtimeHrs: number;
  // litres/hour assumed efficiency baseline (industry: ~3.5 L/h per 30kVA)
  expectedLitres: number;
  invoicedLitres: number;
  pricePerLitre: number; // ₦
};

const ROWS: Row[] = [
  { id: "vi", branch: "Victoria Island Hub",     region: "Lagos",        runtimeHrs:  42, expectedLitres:  168, invoicedLitres:  182, pricePerLitre: 1280 },
  { id: "ab", branch: "Abuja Corporate HQ",      region: "FCT",          runtimeHrs:  88, expectedLitres:  352, invoicedLitres:  468, pricePerLitre: 1320 },
  { id: "ph", branch: "Port Harcourt Outlet",    region: "Rivers",       runtimeHrs: 134, expectedLitres:  536, invoicedLitres:  742, pricePerLitre: 1240 },
  { id: "kn", branch: "Kano Logistics Depot",    region: "Kano",         runtimeHrs:  61, expectedLitres:  244, invoicedLitres:  252, pricePerLitre: 1310 },
  { id: "ib", branch: "Ibadan Regional Office",  region: "Oyo",          runtimeHrs:  29, expectedLitres:  116, invoicedLitres:  118, pricePerLitre: 1290 },
  { id: "en", branch: "Enugu Trade Centre",      region: "Enugu",        runtimeHrs:  74, expectedLitres:  296, invoicedLitres:  364, pricePerLitre: 1305 },
];

const FRAUD_THRESHOLD = 0.15; // 15%
const naira = (n: number) =>
  "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

function flagPct(r: Row) {
  return (r.invoicedLitres - r.expectedLitres) / r.expectedLitres;
}

function DiscrepancyRow({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const pct = flagPct(row);
  const flagged = pct > FRAUD_THRESHOLD;
  const overspend = (row.invoicedLitres - row.expectedLitres) * row.pricePerLitre;

  return (
    <>
      <tr
        onClick={() => flagged && setOpen((o) => !o)}
        className={`group transition-colors ${
          flagged ? "cursor-pointer hover:bg-[oklch(0.30_0.12_28_/_0.06)]" : ""
        }`}
        style={{ borderTop: "1px solid oklch(1 0 0 / 0.05)" }}
      >
        <td className="px-4 py-3.5 align-top">
          <div className="flex items-start gap-2.5">
            {flagged && (
              <span
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                style={{
                  background: "oklch(0.30 0.12 28 / 0.18)",
                  color: "oklch(0.85 0.16 28)",
                  boxShadow: "inset 0 0 0 1px oklch(0.78 0.15 28 / 0.4)",
                }}
              >
                <AlertTriangle className="h-3 w-3" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[14px] font-semibold tracking-tight truncate">{row.branch}</p>
              <p className="text-[10px] tracking-[0.18em] uppercase text-silver/70 mt-0.5">{row.region}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 align-top text-right">
          <p className="num text-[14px] font-semibold">{row.runtimeHrs}h</p>
          <p className="text-[10px] text-silver/70 mt-0.5">logged · 30d</p>
        </td>
        <td className="px-4 py-3.5 align-top text-right">
          <p className="num text-[14px] font-semibold">{row.expectedLitres} L</p>
          <p className="text-[10px] text-silver/70 mt-0.5">@ 4.0 L/h baseline</p>
        </td>
        <td className="px-4 py-3.5 align-top text-right">
          <div className="inline-flex flex-col items-end">
            <p
              className="num text-[14px] font-semibold"
              style={{ color: flagged ? "oklch(0.88 0.16 28)" : "oklch(1 0 0)" }}
            >
              {row.invoicedLitres} L
            </p>
            <p className="text-[10px] text-silver/70 mt-0.5">
              {naira(row.invoicedLitres * row.pricePerLitre)}
            </p>
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.14em] uppercase"
              style={{
                color: flagged ? "oklch(0.88 0.16 28)" : "oklch(0.88 0.16 165)",
                background: flagged
                  ? "oklch(0.30 0.12 28 / 0.16)"
                  : "oklch(0.30 0.10 165 / 0.16)",
                boxShadow: `inset 0 0 0 1px ${
                  flagged ? "oklch(0.78 0.15 28 / 0.4)" : "oklch(0.74 0.17 165 / 0.4)"
                }`,
              }}
            >
              {pct >= 0 ? "+" : ""}
              {(pct * 100).toFixed(1)}%
              {flagged && (
                <ChevronDown
                  className={`h-2.5 w-2.5 transition-transform ${open ? "rotate-180" : ""}`}
                />
              )}
            </span>
          </div>
        </td>
      </tr>

      {/* Smooth row expansion */}
      {flagged && (
        <tr aria-hidden={!open}>
          <td colSpan={4} className="p-0">
            <div
              className="grid transition-[grid-template-rows] duration-500 ease-out"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div
                  className="mx-4 mb-3 rounded-xl hairline p-4"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.30 0.12 28 / 0.10), oklch(0.16 0.015 265 / 0.5))",
                    boxShadow:
                      "inset 0 0 0 1px oklch(0.78 0.15 28 / 0.30), 0 0 28px oklch(0.78 0.15 28 / 0.10)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: "oklch(0.30 0.12 28 / 0.20)",
                        color: "oklch(0.88 0.16 28)",
                      }}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] tracking-[0.22em] uppercase text-[oklch(0.88_0.16_28)]">
                        Discrepancy Flagged
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-silver/90 max-w-3xl">
                        Unusually high fuel consumption relative to generator activity log.
                        Investigate for potential fuel leakage or fraud.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Mini label="Δ Litres" value={`+${(row.invoicedLitres - row.expectedLitres).toFixed(0)} L`} tone="amber" />
                    <Mini label="Overspend" value={naira(overspend)} tone="amber" />
                    <Mini label="Implied L/h" value={(row.invoicedLitres / row.runtimeHrs).toFixed(2)} />
                    <Mini label="Baseline L/h" value="4.00" />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase hairline transition-colors hover:bg-white/5"
                      style={{ color: "oklch(0.92 0.12 165)" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success(`Audit case opened for ${row.branch}`);
                      }}
                    >
                      Open Audit Case
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase hairline transition-colors hover:bg-white/5 text-silver"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.message(`Notified branch manager · ${row.branch}`);
                      }}
                    >
                      Notify Manager
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Mini({
  label, value, tone,
}: { label: string; value: string; tone?: "amber" | "emerald" }) {
  const color =
    tone === "amber" ? "oklch(0.92 0.14 75)" :
    tone === "emerald" ? "oklch(0.92 0.12 165)" : "oklch(1 0 0)";
  return (
    <div className="rounded-lg hairline px-2.5 py-2" style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}>
      <p className="text-[9px] tracking-[0.22em] uppercase text-silver/70">{label}</p>
      <p className="num text-[13px] font-semibold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}

/* ─────────────────────────── ROI Ledger ─────────────────────────── */

const CAPEX = 184_500_000;            // ₦
const MONTHLY_SAVINGS = 8_240_000;    // ₦
const CUMULATIVE_SAVINGS = 73_180_000;// ₦

function ROILedger() {
  const monthsToPayback = Math.ceil((CAPEX - CUMULATIVE_SAVINGS) / MONTHLY_SAVINGS);
  const progress = Math.min(100, (CUMULATIVE_SAVINGS / CAPEX) * 100);

  const exportReport = (kind: "pdf" | "csv") => {
    if (kind === "csv") {
      const csv =
        "Metric,Value\n" +
        `Total Capital Invested,${CAPEX}\n` +
        `Cumulative Utility Bill Savings,${CUMULATIVE_SAVINGS}\n` +
        `Monthly Average Savings,${MONTHLY_SAVINGS}\n` +
        `Estimated Months to Full Payback,${monthsToPayback}\n`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aura-executive-roi-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Executive financial report exported · CSV");
    } else {
      toast.success("PDF export queued · delivered to inbox in 60s");
    }
  };

  return (
    <article className="glass-card p-6 md:p-7 relative overflow-hidden h-full">
      <div
        className="absolute -top-24 -right-24 h-72 w-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(closest-side, oklch(0.78 0.13 86 / 0.18), transparent 70%)" }}
        aria-hidden
      />
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.32em] uppercase text-silver/80">Monthly ROI Ledger</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">
            <span className="shimmer-text">Naira Statement</span> · Solar Infrastructure
          </h3>
        </div>
        <span
          className="h-9 w-9 rounded-xl hairline grid place-items-center"
          style={{ background: "oklch(0.30 0.10 86 / 0.18)", color: "oklch(0.92 0.12 86)", boxShadow: "0 0 22px oklch(0.78 0.13 86 / 0.35)" }}
        >
          <Wallet className="h-4 w-4" />
        </span>
      </header>

      <dl className="mt-5 space-y-3">
        <LedgerRow label="Total Capital Invested" value={naira(CAPEX)} sub="Solar arrays · BESS · BMS · Install" />
        <LedgerRow label="Cumulative Utility Savings" value={naira(CUMULATIVE_SAVINGS)} sub="Diesel + grid offset · all sites" tone="emerald" />
        <LedgerRow
          label="Months to Full Payback"
          value={`${monthsToPayback} mo`}
          sub={`@ ${naira(MONTHLY_SAVINGS)} avg / mo`}
          icon={<TrendingUp className="h-3 w-3" />}
        />
      </dl>

      {/* Payback meter */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-[10px] tracking-[0.22em] uppercase text-silver/70">
          <span>Payback progress</span>
          <span className="num">{progress.toFixed(1)}%</span>
        </div>
        <div
          className="mt-2 h-2 rounded-full overflow-hidden"
          style={{ background: "oklch(1 0 0 / 0.06)", boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.06)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, oklch(0.78 0.17 165), oklch(0.88 0.16 165), oklch(0.78 0.13 86))",
              boxShadow: "0 0 18px oklch(0.78 0.13 86 / 0.45)",
              transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </div>
      </div>

      {/* Export button */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => exportReport("pdf")}
          className="group inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5"
          style={{
            color: "oklch(0.13 0.003 265)",
            background: "linear-gradient(135deg, oklch(0.89 0.07 88), oklch(0.78 0.13 86))",
            boxShadow: "0 10px 32px oklch(0.78 0.13 86 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.4)",
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Export Executive Financial Report
          <span className="opacity-70 normal-case tracking-normal">PDF</span>
        </button>
        <button
          type="button"
          onClick={() => exportReport("csv")}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-semibold tracking-[0.22em] uppercase hairline text-silver transition-colors hover:bg-white/5 hover:text-white"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          CSV
        </button>
      </div>
    </article>
  );
}

function LedgerRow({
  label, value, sub, tone, icon,
}: {
  label: string; value: string; sub?: string; tone?: "emerald"; icon?: React.ReactNode;
}) {
  const color = tone === "emerald" ? "oklch(0.92 0.12 165)" : "oklch(1 0 0)";
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-xl hairline px-3.5 py-3"
      style={{ background: "oklch(0.16 0.015 265 / 0.45)" }}
    >
      <div className="min-w-0">
        <p className="text-[10px] tracking-[0.22em] uppercase text-silver/80 flex items-center gap-1.5">
          {icon}
          {label}
        </p>
        {sub && <p className="text-[11px] text-silver/70 mt-0.5 truncate">{sub}</p>}
      </div>
      <p className="num text-[16px] font-semibold tracking-tight whitespace-nowrap" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

/* ─────────────────────── Email Digest Toggle ─────────────────────── */

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function EmailDigest() {
  const [enabled, setEnabled] = useState(true);
  const [emails, setEmails] = useState<string[]>([
    "cfo@aura-corp.ng",
    "coo@aura-corp.ng",
  ]);
  const [draft, setDraft] = useState("");

  const addEmail = (raw: string) => {
    const clean = raw.trim().replace(/[,;]+$/g, "");
    if (!clean) return;
    if (!EMAIL_RX.test(clean) || clean.length > 254) {
      toast.error("Invalid email address");
      return;
    }
    if (emails.includes(clean)) {
      toast.message("Recipient already added");
      return;
    }
    if (emails.length >= 12) {
      toast.error("Maximum 12 board recipients");
      return;
    }
    setEmails((prev) => [...prev, clean]);
    setDraft("");
  };

  const removeEmail = (e: string) =>
    setEmails((prev) => prev.filter((x) => x !== e));

  return (
    <article className="glass-card p-6 md:p-7 relative overflow-hidden h-full">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-[0.32em] uppercase text-silver/80">Automated Monthly Digest</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">
            Board-Level <span className="shimmer-text">Energy Audit</span> Delivery
          </h3>
        </div>
        <span
          className="h-9 w-9 rounded-xl hairline grid place-items-center"
          style={{ background: "oklch(0.30 0.10 282 / 0.18)", color: "oklch(0.86 0.14 282)", boxShadow: "0 0 22px oklch(0.62 0.20 282 / 0.35)" }}
        >
          <Mail className="h-4 w-4" />
        </span>
      </header>

      {/* Toggle row */}
      <div
        className="mt-5 flex items-center justify-between gap-4 rounded-xl hairline px-4 py-3.5"
        style={{ background: "oklch(0.16 0.015 265 / 0.5)" }}
      >
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-tight">
            Send Monthly Energy Audit
          </p>
          <p className="text-[11px] text-silver/80 mt-0.5">
            Delivered the 1st of each month to corporate board members.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => {
            setEnabled((e) => !e);
            toast.success(enabled ? "Digest paused" : "Monthly digest activated");
          }}
          className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300"
          style={{
            background: enabled
              ? "linear-gradient(135deg, oklch(0.78 0.17 165), oklch(0.78 0.13 86))"
              : "oklch(1 0 0 / 0.10)",
            boxShadow: enabled
              ? "0 0 24px oklch(0.74 0.17 165 / 0.45), inset 0 0 0 1px oklch(1 0 0 / 0.1)"
              : "inset 0 0 0 1px oklch(1 0 0 / 0.12)",
          }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-300"
            style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
          />
        </button>
      </div>

      {/* Chip input */}
      <div className="mt-5">
        <p className="text-[10px] tracking-[0.22em] uppercase text-silver/80 mb-2">
          Board Recipients · {emails.length}/12
        </p>
        <div
          className="rounded-xl hairline p-2.5 flex flex-wrap gap-1.5 transition-colors focus-within:bg-[oklch(0.16_0.015_265_/_0.65)]"
          style={{ background: "oklch(0.16 0.015 265 / 0.45)" }}
        >
          {emails.map((e) => (
            <span
              key={e}
              className="group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium hairline transition-all"
              style={{
                background: "oklch(0.30 0.10 282 / 0.16)",
                color: "oklch(0.92 0.10 282)",
                boxShadow: "inset 0 0 0 1px oklch(0.62 0.20 282 / 0.35)",
              }}
            >
              <Sparkles className="h-2.5 w-2.5 opacity-70" />
              {e}
              <button
                type="button"
                aria-label={`Remove ${e}`}
                onClick={() => removeEmail(e)}
                className="ml-0.5 -mr-1 rounded-full p-0.5 opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}

          <input
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addEmail(draft);
              } else if (e.key === "Backspace" && !draft && emails.length) {
                removeEmail(emails[emails.length - 1]);
              }
            }}
            onBlur={() => draft && addEmail(draft)}
            placeholder={emails.length ? "Add another…" : "director@company.com"}
            className="flex-1 min-w-[140px] bg-transparent text-[12px] outline-none px-2 py-1 text-white placeholder:text-silver/50"
          />
        </div>

        <button
          type="button"
          onClick={() => addEmail(draft)}
          disabled={!draft}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold tracking-[0.22em] uppercase hairline text-silver transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Plus className="h-3 w-3" /> Add Recipient
        </button>
      </div>

      <p className="mt-4 text-[10px] tracking-[0.18em] uppercase text-silver/60">
        Encrypted · GDPR-aware · One-click unsubscribe per recipient
      </p>
    </article>
  );
}

/* ─────────────────────────── Hub Wrapper ─────────────────────────── */

export function ExecutiveReporting() {
  const totalDelta = useMemo(
    () =>
      ROWS.reduce((s, r) => s + Math.max(0, r.invoicedLitres - r.expectedLitres) * r.pricePerLitre, 0),
    [],
  );
  const flaggedCount = useMemo(() => ROWS.filter((r) => flagPct(r) > FRAUD_THRESHOLD).length, []);

  return (
    <section className="glass-card p-6 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] tracking-[0.32em] uppercase text-silver">Executive Reporting & Diesel Fraud Audit Hub</p>
          <h2 className="mt-1 text-2xl md:text-[28px] font-semibold tracking-tight">
            <span className="shimmer-text">Board-grade</span> financial & integrity overview
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase"
            style={{
              color: "oklch(0.88 0.16 28)",
              background: "oklch(0.30 0.12 28 / 0.18)",
              boxShadow: "inset 0 0 0 1px oklch(0.78 0.15 28 / 0.45)",
            }}
          >
            <ShieldAlert className="h-3 w-3" /> {flaggedCount} flagged
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase"
            style={{
              color: "oklch(0.92 0.12 86)",
              background: "oklch(0.30 0.10 86 / 0.16)",
              boxShadow: "inset 0 0 0 1px oklch(0.78 0.13 86 / 0.4)",
            }}
          >
            Δ {naira(totalDelta)} overspend
          </span>
        </div>
      </header>

      {/* 1 · Diesel Discrepancy Matrix */}
      <div
        className="rounded-2xl hairline overflow-hidden"
        style={{ background: "oklch(0.16 0.015 265 / 0.4)" }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[oklch(1_0_0_/_0.06)]">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-silver/80" />
            <p className="text-[11px] tracking-[0.32em] uppercase text-silver">Diesel Discrepancy Matrix · 30-day window</p>
          </div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-silver/70">
            Baseline 4.0 L/h · Threshold +{(FRAUD_THRESHOLD * 100).toFixed(0)}%
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] tracking-[0.22em] uppercase text-silver/70">
                <th className="px-4 py-2.5 font-medium">Branch Location</th>
                <th className="px-4 py-2.5 font-medium text-right">Generator Run-Time</th>
                <th className="px-4 py-2.5 font-medium text-right">Expected Fuel</th>
                <th className="px-4 py-2.5 font-medium text-right">Invoiced Diesel · ₦/L</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <DiscrepancyRow key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-[oklch(1_0_0_/_0.06)] flex items-center justify-between text-[10px] text-silver/70 tracking-[0.22em] uppercase">
          <span>Click any flagged row to expand audit detail</span>
          <span>Source · Generator BMS + Vendor Invoice OCR</span>
        </div>
      </div>

      {/* Divider */}
      <div
        className="my-7 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.10) 20%, oklch(0.78 0.13 86 / 0.25) 50%, oklch(1 0 0 / 0.10) 80%, transparent)",
        }}
        aria-hidden
      />

      {/* 2 · ROI Ledger + 3 · Email Digest */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <ROILedger />
        </div>
        <div className="lg:col-span-6">
          <EmailDigest />
        </div>
      </div>
    </section>
  );
}
