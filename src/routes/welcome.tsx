import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Activity,
  Zap,
  Sun,
  Receipt,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Wallet,
  Cpu,
  LineChart,
  Lock,
  Mail,
  MapPin,
  Phone,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

export const Route = createFileRoute("/welcome")({
  component: Welcome,
});

const GOLD = "#FFD700";
const MINT = "#00FF9D";

type AuthMode = "signin" | "signup" | null;

function Welcome() {
  const [authMode, setAuthMode] = useState<AuthMode>(null);

  return (
    <div
      className="min-h-screen w-full font-sans text-white antialiased selection:bg-[#FFD700]/30"
      style={{
        background:
          "radial-gradient(1200px 600px at 80% -10%, rgba(255,215,0,0.08), transparent 60%), radial-gradient(900px 500px at -10% 30%, rgba(0,255,157,0.06), transparent 55%), #0A0A0A",
        fontFamily:
          '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Header onAuth={setAuthMode} />
      <Hero onAuth={setAuthMode} />
      <CommandCenter />
      <HowItWorks />
      <HistoryPreview />
      <ComplianceFooter />

      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSwitch={setAuthMode} />}
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header({ onAuth }: { onAuth: (m: AuthMode) => void }) {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(10,10,10,0.7)" }}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-8 h-16 flex items-center justify-between">
        <Link to="/welcome" className="flex items-center gap-2.5 group">
          <span
            className="grid place-items-center h-9 w-9 rounded-lg border"
            style={{
              borderColor: "rgba(255,215,0,0.35)",
              background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(0,255,157,0.08))",
              boxShadow: "0 0 24px rgba(255,215,0,0.18)",
            }}
          >
            <Sun className="h-4.5 w-4.5" style={{ color: GOLD }} />
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-bold tracking-[0.18em]">ESO ENERGY</p>
            <p className="text-[9px] tracking-[0.32em] text-white/40 font-mono">TECH · LIMITED</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onAuth("signin")}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide hover:bg-white/5 transition"
            style={{ borderColor: "rgba(255,255,255,0.15)" }}
          >
            Sign In
          </button>
          <button
            onClick={() => onAuth("signup")}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold tracking-wide text-black transition hover:brightness-110 active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${GOLD}, #FFB800)`,
              boxShadow: "0 8px 24px rgba(255,215,0,0.25)",
            }}
          >
            Sign Up <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero({ onAuth }: { onAuth: (m: AuthMode) => void }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 md:px-8 pt-14 md:pt-20 pb-16">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="space-y-6"
        >
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-mono tracking-[0.28em] uppercase"
            style={{ borderColor: "rgba(255,215,0,0.3)", color: GOLD, background: "rgba(255,215,0,0.06)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: MINT }} />
            Live Across Nigeria
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            Unified Energy &{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${GOLD}, #FFEC8B)` }}
            >
              Utility Command.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-white/65 leading-relaxed max-w-xl">
            ESO ENERGY TECH LIMITED unifies solar inverter intelligence and utility bill payments
            into one transparent, enterprise-grade command surface — built for households,
            estates, and businesses across Africa.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onAuth("signup")}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold tracking-wide text-black transition hover:brightness-110 active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${GOLD}, #FFB800)`,
                boxShadow: "0 12px 36px rgba(255,215,0,0.3)",
              }}
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </button>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border px-6 py-3.5 text-sm font-semibold hover:bg-white/5 transition"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            >
              How it works
            </a>
          </div>

          <div className="flex items-center gap-6 pt-4 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" style={{ color: MINT }} /> AES-256 secured
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" style={{ color: MINT }} /> CBN-aligned payments
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <DashboardMock />
        </motion.div>
      </div>
    </section>
  );
}

function DashboardMock() {
  return (
    <div
      className="relative rounded-3xl border p-5 backdrop-blur-xl"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">
          Inverter · Live
        </span>
      </div>

      <div
        className="rounded-2xl p-4 border mb-4"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: MINT }} />
            <span className="text-xs font-mono uppercase tracking-wider text-white/70">
              Array Telemetry
            </span>
          </div>
          <span
            className="text-[9px] font-mono px-2 py-0.5 rounded border"
            style={{ color: MINT, borderColor: "rgba(0,255,157,0.3)", background: "rgba(0,255,157,0.08)" }}
          >
            STREAMING
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Yield" value="420.5" unit="kW" />
          <Stat label="Efficiency" value="98.4" unit="%" mint />
          <Stat label="Battery" value="87" unit="%" />
        </div>
        <svg viewBox="0 0 100 24" className="w-full h-12 mt-3" preserveAspectRatio="none">
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={MINT} stopOpacity="0.4" />
              <stop offset="100%" stopColor={MINT} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,18 Q10,8 20,14 T40,12 T60,8 T80,10 T100,6 L100,24 L0,24 Z"
            fill="url(#g)"
          />
          <path
            d="M0,18 Q10,8 20,14 T40,12 T60,8 T80,10 T100,6"
            fill="none"
            stroke={MINT}
            strokeWidth="1.2"
          />
        </svg>
      </div>

      <div
        className="rounded-2xl p-4 border"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" style={{ color: GOLD }} />
            <span className="text-xs font-mono uppercase tracking-wider text-white/70">
              Wallet Balance
            </span>
          </div>
          <ArrowUpRight className="h-4 w-4 text-white/40" />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tracking-tight">
            ₦184,500<span className="text-sm text-white/40">.00</span>
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: MINT }}>
            +12.4% MoM
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit, mint }: { label: string; value: string; unit: string; mint?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-lg font-bold tracking-tight" style={{ color: mint ? MINT : "white" }}>
        {value}
        <span className="text-[10px] text-white/40 ml-1">{unit}</span>
      </p>
    </div>
  );
}

/* ---------------- Command Center ---------------- */
function CommandCenter() {
  const modules = [
    {
      icon: Cpu,
      title: "Eso Inverter Monitoring",
      tag: "Real-time telemetry",
      desc: "Live yield, efficiency, battery health, thermal load and per-string diagnostics across every site in your fleet.",
      bullets: ["Per-string monitoring", "Battery lifespan guard", "Thermal alerts"],
      accent: MINT,
    },
    {
      icon: Receipt,
      title: "Eso Pay Bills",
      tag: "Utility payments",
      desc: "Pay electricity, water, and government utility bills with instant tokens, audit-grade receipts, and zero hidden fees.",
      bullets: ["Instant token delivery", "Verified receipts", "Wallet auto-reload"],
      accent: GOLD,
    },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
      <SectionHead
        eyebrow="The Command Center"
        title="Two modules. One transparent platform."
        sub="Designed for clarity. Operated by enterprise. Open to everyone."
      />

      <div className="grid md:grid-cols-2 gap-5 mt-10">
        {modules.map((m, i) => (
          <motion.div
            key={m.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="group relative rounded-3xl border p-6 md:p-8 backdrop-blur-xl overflow-hidden"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            }}
          >
            <div
              className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition"
              style={{ background: m.accent }}
            />
            <div className="relative">
              <div
                className="inline-flex items-center justify-center h-12 w-12 rounded-xl border mb-5"
                style={{
                  borderColor: `${m.accent}55`,
                  background: `${m.accent}15`,
                }}
              >
                <m.icon className="h-5 w-5" style={{ color: m.accent }} />
              </div>
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/40 mb-2">
                {m.tag}
              </p>
              <h3 className="text-2xl font-bold tracking-tight mb-3">{m.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed mb-5">{m.desc}</p>
              <ul className="space-y-2">
                {m.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-white/75">
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: m.accent }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- How It Works ---------------- */
function HowItWorks() {
  const steps = [
    {
      icon: ShieldCheck,
      title: "Verify & Onboard",
      desc: "Create your account with corporate or personal credentials. Identity-verified through licensed KYC partners.",
    },
    {
      icon: LineChart,
      title: "Connect Your Assets",
      desc: "Pair inverters, meters, and bank wallets. We never resell your data — telemetry stays in your tenant.",
    },
    {
      icon: Zap,
      title: "Pay & Monitor",
      desc: "Settle utility bills instantly and watch energy flow in real time. Every transaction issues an audit receipt.",
    },
  ];

  return (
    <section id="how" className="relative mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
      <SectionHead
        eyebrow="How it works"
        title="Full transparency, end-to-end."
        sub="No gatekeeping. Every fee, flow, and partner is published — for users and regulators alike."
      />

      <div className="grid md:grid-cols-3 gap-5 mt-10">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="rounded-2xl border p-6 backdrop-blur-xl"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span
                className="grid place-items-center h-9 w-9 rounded-lg text-xs font-bold"
                style={{ background: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}40` }}
              >
                0{i + 1}
              </span>
              <s.icon className="h-5 w-5 text-white/70" />
            </div>
            <h4 className="text-lg font-bold tracking-tight mb-2">{s.title}</h4>
            <p className="text-sm text-white/60 leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- History Preview ---------------- */
function HistoryPreview() {
  const rows = [
    { type: "Electricity Token", ref: "EKEDC · 0413-XXXX", amount: "₦25,000", status: "Delivered", time: "2 min ago" },
    { type: "Inverter Sync", ref: "Site · Lekki Phase 1", amount: "—", status: "Healthy", time: "12 min ago" },
    { type: "Wallet Top-up", ref: "Moniepoint · ****91", amount: "₦150,000", status: "Settled", time: "1 hr ago" },
    { type: "Water Bill", ref: "LSWC · Acct 88123", amount: "₦8,400", status: "Delivered", time: "Yesterday" },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
      <SectionHead
        eyebrow="Transaction history"
        title="Every move, on the record."
        sub="A glance-friendly ledger your finance team and your regulators will both love."
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mt-10 rounded-3xl border backdrop-blur-xl overflow-hidden"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
        }}
      >
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b text-[10px] font-mono uppercase tracking-[0.24em] text-white/40"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="col-span-4">Type</div>
          <div className="col-span-4">Reference</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-2 md:grid-cols-12 gap-x-4 gap-y-1 px-5 md:px-6 py-4 border-b last:border-b-0 hover:bg-white/[0.02] transition"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <div className="md:col-span-4">
              <p className="text-sm font-semibold">{r.type}</p>
              <p className="text-[11px] text-white/40 font-mono mt-0.5">{r.time}</p>
            </div>
            <div className="md:col-span-4 text-right md:text-left">
              <p className="text-xs text-white/55 font-mono">{r.ref}</p>
            </div>
            <div className="md:col-span-2 text-sm font-mono font-semibold">{r.amount}</div>
            <div className="md:col-span-2 text-right">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border"
                style={{ color: MINT, borderColor: `${MINT}40`, background: `${MINT}10` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: MINT }} />
                {r.status}
              </span>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

/* ---------------- Compliance Footer ---------------- */
function ComplianceFooter() {
  return (
    <footer className="relative mt-10 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-14">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <span
                className="grid place-items-center h-9 w-9 rounded-lg border"
                style={{
                  borderColor: "rgba(255,215,0,0.35)",
                  background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(0,255,157,0.08))",
                }}
              >
                <Sun className="h-4.5 w-4.5" style={{ color: GOLD }} />
              </span>
              <div className="leading-tight">
                <p className="text-[13px] font-bold tracking-[0.18em]">ESO ENERGY TECH LIMITED</p>
                <p className="text-[9px] tracking-[0.32em] text-white/40 font-mono">
                  RC · NIGERIA
                </p>
              </div>
            </div>
            <p className="text-sm text-white/55 max-w-md leading-relaxed">
              Africa's transparent command layer for solar inverter monitoring and utility bill
              payments. Built for households, estates, and enterprises.
            </p>
            <div className="space-y-2 pt-2 text-sm">
              <p className="flex items-start gap-2 text-white/70">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: GOLD }} />
                6 Uche Step by Step Street, off St. Christopher Road, Oyolu 33,
                Onitsha, Anambra, Nigeria.
              </p>
              <p className="flex items-center gap-2 text-white/70">
                <Mail className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
                <a href="mailto:info@eso-energy.com" className="hover:text-white">
                  info@eso-energy.com
                </a>
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/40 mb-4">
              Platform
            </p>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><a className="hover:text-white" href="#">Inverter Monitoring</a></li>
              <li><a className="hover:text-white" href="#">Pay Bills</a></li>
              <li><a className="hover:text-white" href="#how">How it works</a></li>
              <li><Link to="/login" className="hover:text-white">Sign in</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/40 mb-4">
              Legal
            </p>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><a className="hover:text-white" href="/terms">Terms of Service</a></li>
              <li><a className="hover:text-white" href="/privacy">Privacy Policy</a></li>
              <li><a className="hover:text-white" href="/refunds">Refund / Cancellation</a></li>
              <li><a className="hover:text-white" href="/compliance">Compliance</a></li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 pt-6 border-t flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-[11px] font-mono text-white/40 tracking-wider"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          <p>© {new Date().getFullYear()} ESO ENERGY TECH LIMITED · ALL RIGHTS RESERVED.</p>
          <p className="uppercase">Operated from Onitsha, Anambra · Nigeria</p>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Section Head ---------------- */
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[10px] font-mono uppercase tracking-[0.32em] mb-3" style={{ color: GOLD }}>
        ◆ {eyebrow}
      </p>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">{title}</h2>
      <p className="text-base text-white/55 mt-3 leading-relaxed">{sub}</p>
    </div>
  );
}

/* ---------------- Auth Modal ---------------- */
function AuthModal({
  mode,
  onClose,
  onSwitch,
}: {
  mode: "signin" | "signup";
  onClose: () => void;
  onSwitch: (m: AuthMode) => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const isSignup = mode === "signup";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-md rounded-3xl border p-7"
        style={{
          borderColor: "rgba(255,215,0,0.25)",
          background:
            "radial-gradient(600px 300px at 50% -10%, rgba(255,215,0,0.08), transparent 60%), #0F0F0F",
          boxShadow: "0 40px 100px -20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 grid place-items-center rounded-full hover:bg-white/10 text-white/60"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <p className="text-[10px] font-mono uppercase tracking-[0.32em] mb-2" style={{ color: GOLD }}>
            ESO ENERGY · Secure Gateway
          </p>
          <h3 className="text-2xl font-bold tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h3>
          <p className="text-sm text-white/55 mt-1.5">
            {isSignup
              ? "Onboard your assets in under two minutes."
              : "Sign in to access your command deck."}
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          {isSignup && (
            <Field label="Full Name">
              <input
                required
                type="text"
                placeholder="Adaeze Bello"
                className="w-full bg-black/60 border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/60 transition"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              />
            </Field>
          )}
          <Field label="Email Address">
            <input
              required
              type="email"
              placeholder="you@company.com"
              className="w-full bg-black/60 border rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/60 transition"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input
                required
                type={showPw ? "text" : "password"}
                placeholder="••••••••••"
                className="w-full bg-black/60 border rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#FFD700]/60 transition"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                aria-label="Toggle password"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-black tracking-wide hover:brightness-110 transition active:scale-[0.99]"
            style={{
              background: `linear-gradient(135deg, ${GOLD}, #FFB800)`,
              boxShadow: "0 10px 30px rgba(255,215,0,0.25)",
            }}
          >
            <Lock className="h-4 w-4" />
            {isSignup ? "Create Account" : "Sign In Securely"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-white/55">
          {isSignup ? "Already onboarded?" : "New to ESO?"}{" "}
          <button
            onClick={() => onSwitch(isSignup ? "signin" : "signup")}
            className="font-semibold underline-offset-4 hover:underline"
            style={{ color: GOLD }}
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-[0.24em] text-white/50 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
