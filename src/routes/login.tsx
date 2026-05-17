import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Building2,
  Shield,
  Check,
  ChevronDown,
} from "lucide-react";
import { EsoLogo } from "@/components/aura/EsoLogo";
import {
  SignupSuccessCard,
  AuthenticatingOverlay,
} from "@/components/aura/AuthOverlays";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in · EsoEnergy Systems" },
      { name: "description", content: "Sovereign access to the EsoEnergy Systems command deck." },
    ],
  }),
});

type Mode = "signin" | "signup";

const ACCESS_TIERS = [
  "Tier 1 - Read-Only Observer",
  "Tier 2 - Field Telemetry Only",
  "Tier 3 - Operations Console",
  "Tier 4 - Fleet Command",
  "Tier 5 - Sovereign Admin",
];

function generateTicket() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `ESO-REQ-${n}X`;
}

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [tier, setTier] = useState(ACCESS_TIERS[1]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "authenticating" | "signup-success">("idle");
  const [ctaLabel, setCtaLabel] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string>("");

  useEffect(() => {
    if (!loading && session && phase !== "signup-success") {
      const t = setTimeout(() => navigate({ to: "/" }), 900);
      return () => clearTimeout(t);
    }
  }, [loading, session, navigate, phase]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setDirection(next === "signup" ? 1 : -1);
    setMode(next);
    setPhase("idle");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setCtaLabel("ESTABLISHING SECURE PROTOCOLS…");
    await new Promise((r) => setTimeout(r, 650));
    try {
      if (mode === "signin") {
        if (!email || !password) throw new Error("Email and password are required.");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setPhase("authenticating");
      } else {
        if (!fullName.trim()) throw new Error("Please enter your full name.");
        if (!email.trim()) throw new Error("Corporate email is required.");
        if (!company.trim()) throw new Error("Organization is required.");
        // Synthesize a placeholder password for the access request log
        const tempPw = `Req-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: tempPw,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName.trim(),
              company: company.trim(),
              access_tier: tier,
            },
          },
        });
        if (error) throw error;
        setTicketId(generateTicket());
        setPhase("signup-success");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      toast.error("EsoEnergy Systems", { description: msg });
      setBusy(false);
      setCtaLabel(null);
      return;
    }
    setBusy(false);
    setCtaLabel(null);
  };

  const returnToDeck = () => {
    setPhase("idle");
    setFullName("");
    setPassword("");
    switchMode("signin");
  };

  const isSignin = mode === "signin";
  const showSuccess = phase === "signup-success";

  return (
    <div className="deck-canvas min-h-screen flex items-center justify-center px-5 py-10 overflow-hidden">
      <div className="deck-card py-9 md:py-11 px-7 md:px-10 relative">
        {busy && <div className="deck-progress" aria-hidden />}

        <Link to="/login" className="block mb-7 text-center">
          <EsoLogo size="lg" variant="display" className="mx-auto" />
          <p className="mt-3 text-[10px] tracking-[0.32em] text-white/40 uppercase font-mono">
            Secure Multi-Tenant Telemetry Gateway
          </p>
          <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-[11px] font-medium text-white/70">
            <ShieldCheck className="h-3.5 w-3.5 text-[#14b8a6]" aria-hidden />
            <span>AES-256 session · Verified bearer · Africa premium tier</span>
          </p>
        </Link>

        {/* Capsule tabs */}
        <div className="deck-tabs mb-8" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={isSignin}
            data-active={isSignin}
            onClick={() => switchMode("signin")}
            className="deck-tab"
          >
            Enter Command Deck
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isSignin}
            data-active={!isSignin}
            onClick={() => switchMode("signup")}
            className="deck-tab"
          >
            Request Access
          </button>
        </div>

        <div className="relative min-h-[460px]">
          <AnimatePresence mode="wait" initial={false}>
            {showSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <SuccessPanel ticketId={ticketId} onReturn={returnToDeck} />
              </motion.div>
            ) : (
              <motion.div
                key={mode}
                initial={{ x: 50 * direction, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50 * direction, opacity: 0 }}
                transition={{ type: "spring", stiffness: 130, damping: 16 }}
              >
                <h1
                  className="text-[26px] md:text-[28px] leading-[1.15] tracking-tight text-white"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 500 }}
                >
                  {isSignin ? "Sign in to your command deck" : "Request secure terminal credentials"}
                </h1>
                <p
                  className="mt-2 text-[11px] text-white/50 leading-relaxed"
                  style={{ fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace' }}
                >
                  {isSignin
                    ? "Sovereign telemetry · encrypted by default."
                    : "System vetting required · Authorization takes 2-4 business hours."}
                </p>

                <form onSubmit={submit} className={`mt-7 ${isSignin ? "space-y-4" : "space-y-6"}`} noValidate>
                  <Stagger>
                    {isSignin ? (
                      <>
                        <Field
                          id="email"
                          type="email"
                          label="Email"
                          value={email}
                          onChange={setEmail}
                          autoComplete="email"
                          icon={<Mail className="h-4 w-4" />}
                          placeholder="operator@yourcompany.ng"
                        />
                        <Field
                          id="password"
                          type="password"
                          label="Password"
                          value={password}
                          onChange={setPassword}
                          autoComplete="current-password"
                          icon={<Lock className="h-4 w-4" />}
                          placeholder="••••••••••"
                        />
                      </>
                    ) : (
                      <>
                        <Field
                          id="fullName"
                          type="text"
                          label="Full Name"
                          value={fullName}
                          onChange={setFullName}
                          autoComplete="name"
                          icon={<User className="h-4 w-4" />}
                          placeholder="Operator Name"
                        />
                        <Field
                          id="email"
                          type="email"
                          label="Corporate Email"
                          value={email}
                          onChange={setEmail}
                          autoComplete="email"
                          icon={<Mail className="h-4 w-4" />}
                          placeholder="name@yourcompany.ng"
                        />
                        <Field
                          id="company"
                          type="text"
                          label="Organization / Facility"
                          value={company}
                          onChange={setCompany}
                          autoComplete="organization"
                          icon={<Building2 className="h-4 w-4" />}
                          placeholder="Lagos Hub Alpha"
                        />
                        <TierSelect value={tier} onChange={setTier} />
                      </>
                    )}

                    <button type="submit" disabled={busy} className="deck-cta mt-2">
                      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>
                        {ctaLabel
                          ? ctaLabel
                          : isSignin
                            ? "Initialize Command Flow"
                            : "Submit Credential Request"}
                      </span>
                    </button>

                    {isSignin && (
                      <Link
                        to="/forgot-password"
                        className="block w-full text-center text-[10.5px] tracking-[0.28em] uppercase text-white/45 hover:text-[#e5b974] transition-colors"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </Stagger>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-9 pt-5 border-t border-white/5 deck-meta">
          <span className="ml">V4.2</span>
          <span className="mc">ENCRYPTED POP</span>
          <span className="mr">LAGOS</span>
          <span className="ml">MESH</span>
          <span className="mc" />
          <span className="mr">FRANKFURT</span>
        </div>
      </div>

      <AnimatePresence>
        {phase === "authenticating" && <AuthenticatingOverlay />}
      </AnimatePresence>
    </div>
  );
}

function SuccessPanel({ ticketId, onReturn }: { ticketId: string; onReturn: () => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-2">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.05 }}
        className="relative grid place-items-center h-20 w-20 rounded-full"
        style={{
          border: "1px solid rgba(16, 185, 129, 0.55)",
          boxShadow:
            "0 0 0 6px rgba(16,185,129,0.06), 0 0 40px rgba(16,185,129,0.35), inset 0 0 24px rgba(16,185,129,0.18)",
          background: "radial-gradient(circle at 50% 50%, rgba(16,185,129,0.18), rgba(16,185,129,0.02))",
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.25 }}
        >
          <Check className="h-9 w-9" style={{ color: "#34d399" }} strokeWidth={2.4} />
        </motion.div>
      </motion.div>

      <h2
        className="mt-6 text-[22px] md:text-[24px] leading-tight text-white"
        style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 500 }}
      >
        Request Logged in Gateway Ledger
      </h2>
      <p
        className="mt-2 text-[10.5px] text-white/55 tracking-[0.18em]"
        style={{ fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace' }}
      >
        SECURE HANDSHAKE COMPLETE
      </p>

      <div
        className="mt-6 w-full rounded-xl px-4 py-3.5 text-left"
        style={{
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
          fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
        }}
      >
        <div className="flex items-center justify-between text-[10px] tracking-[0.22em] text-white/40 uppercase mb-1.5">
          <span>Ticket</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending
          </span>
        </div>
        <div className="text-[11.5px] text-white/85 break-all">
          TICKET ID: <span className="text-[#e5b974]">{ticketId}</span> · STATUS: PENDING SECURITY CLEARANCE
        </div>
      </div>

      <button
        type="button"
        onClick={onReturn}
        className="mt-7 text-[10.5px] tracking-[0.28em] uppercase text-white/55 hover:text-[#e5b974] transition-colors"
      >
        ← Return to Sign In
      </button>
    </div>
  );
}

function TierSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref}>
      <label className="deck-label mb-2">Access Level Req.</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="deck-input-wrap w-full text-left"
          data-open={open}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="deck-icon-slot" aria-hidden>
            <Shield className="h-4 w-4" />
          </span>
          <span className="deck-input flex items-center justify-between pr-10">
            <span className="text-white/90 text-[13px]">{value}</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl"
              style={{
                background: "rgba(10, 14, 22, 0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow:
                  "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08), 0 0 28px rgba(139,92,246,0.12)",
              }}
            >
              {ACCESS_TIERS.map((t) => {
                const active = t === value;
                return (
                  <li key={t}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(t);
                        setOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-[12.5px] text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                      <span>{t}</span>
                      {active && <Check className="h-3.5 w-3.5 text-[#a78bfa]" />}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stagger({ children }: { children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children.flat().filter(Boolean) : [children];
  return (
    <>
      {arr.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 + i * 0.05, type: "spring", stiffness: 220, damping: 22 }}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  icon,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="deck-label mb-2">
        {label}
      </label>
      <div className="deck-input-wrap">
        <span className="deck-icon-slot" aria-hidden>
          {icon}
        </span>
        <input
          id={id}
          type={type}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="deck-input"
        />
      </div>
    </div>
  );
}

// SignupSuccessCard import retained for tree compatibility but unused now.
void SignupSuccessCard;
