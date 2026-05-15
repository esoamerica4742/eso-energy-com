import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, Mail, ShieldCheck, User } from "lucide-react";
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

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "authenticating" | "signup-success">("idle");

  useEffect(() => {
    if (!loading && session && phase !== "signup-success") {
      // small delay so the authenticating overlay can breathe
      const t = setTimeout(() => navigate({ to: "/" }), 900);
      return () => clearTimeout(t);
    }
  }, [loading, session, navigate, phase]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setDirection(next === "signup" ? 1 : -1);
    setErr(null);
    setInfo(null);
    setMode(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setPhase("authenticating");
      } else {
        if (!fullName.trim()) throw new Error("Please enter your full name");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        setPhase("signup-success");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const returnToDeck = () => {
    setPhase("idle");
    setFullName("");
    setPassword("");
    switchMode("signin");
  };

  return (
    <div
      className="login-bg min-h-screen flex items-center justify-center px-5 py-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(1100px 600px at 20% 0%, oklch(0.62 0.20 282 / 0.18), transparent 60%), radial-gradient(900px 500px at 100% 100%, oklch(0.78 0.13 86 / 0.10), transparent 60%), oklch(0.13 0.003 265)",
      }}
    >
      <div
        className="w-full max-w-md glass-card py-8 md:py-10 px-[44px] md:px-[52px] relative"
        style={{ boxShadow: "0 30px 80px -20px oklch(0 0 0 / 0.7), inset 0 1px 0 oklch(1 0 0 / 0.08)" }}
      >
        <Link to="/login" className="block mb-6 text-center">
          <EsoLogo size="lg" variant="display" className="mx-auto" />
          <p className="mt-3 text-[10px] tracking-[0.32em] text-silver/70 uppercase font-mono">
            Secure Multi-Tenant Telemetry Gateway // NGA-Region-2026
          </p>
          <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-[11px] font-medium text-silver/90">
            <ShieldCheck className="h-3.5 w-3.5 text-[oklch(0.78_0.14_175)]" aria-hidden />
            <span>AES-256 session · Verified bearer token · Africa premium tier</span>
          </p>
        </Link>

        {/* Mode toggle — proper tabs */}
        <div
          className="grid grid-cols-2 gap-2 p-1.5 rounded-full mb-7"
          style={{ background: "oklch(0.13 0.003 265 / 0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            data-active={mode === "signin"}
            onClick={() => switchMode("signin")}
            className="lux-tab"
          >
            Enter Command Deck
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            data-active={mode === "signup"}
            onClick={() => switchMode("signup")}
            className="lux-tab"
          >
            Request Access
          </button>
        </div>

        <div className="relative min-h-[420px]">
          <motion.div
            animate={
              phase === "signup-success"
                ? { opacity: 0, filter: "blur(12px)", y: -10, scale: 0.98 }
                : { opacity: 1, filter: "blur(0px)", y: 0, scale: 1 }
            }
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ pointerEvents: phase === "signup-success" ? "none" : "auto" }}
          >
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={mode}
                initial={{ x: 60 * direction, opacity: 0, scale: 0.97 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: -60 * direction, opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 120, damping: 14 }}
              >
                <h1 className="text-2xl font-semibold tracking-tight">
                  {mode === "signin" ? "Sign in to your command deck" : "Provision a new operator"}
                </h1>
                {mode === "signup" && (
                  <p className="mt-1.5 text-[12px] tracking-wide text-silver/80">
                    Sovereign access in under 30 seconds. Encrypted by default.
                  </p>
                )}

                <form onSubmit={submit} className="mt-7 space-y-4">
                  <StaggerList key={mode}>
                    {mode === "signup" && (
                      <Field
                        id="fullName"
                        type="text"
                        label="Full Name"
                        value={fullName}
                        onChange={setFullName}
                        autoComplete="name"
                        icon={<User className="h-3.5 w-3.5 text-silver" />}
                        placeholder="Ada Lovelace"
                      />
                    )}
                    <Field
                      id="email"
                      type="email"
                      label="Email"
                      value={email}
                      onChange={setEmail}
                      autoComplete="email"
                      icon={<Mail className="h-3.5 w-3.5 text-silver" />}
                      placeholder="operator@yourcompany.ng"
                    />
                    <Field
                      id="password"
                      type="password"
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      icon={<Lock className="h-3.5 w-3.5 text-silver" />}
                      placeholder={mode === "signin" ? "••••••••••" : "At least 8 characters"}
                    />

                    {err && (
                      <p className="text-[12px] text-[oklch(0.85_0.18_25)] hairline rounded-md px-3 py-2 bg-[oklch(0.30_0.10_25_/_0.18)]">
                        {err}
                      </p>
                    )}
                    {info && (
                      <p className="text-[12px] text-[var(--gold)] hairline rounded-md px-3 py-2 bg-[oklch(0.30_0.10_165_/_0.18)]">
                        {info}
                      </p>
                    )}

                    <ShimmerButton busy={busy} label={
                      busy
                        ? mode === "signin" ? "Initializing…" : "Provisioning…"
                        : mode === "signin" ? "Initialize Command Flow" : "Submit Access Setup"
                    } />

                    {mode === "signin" && (
                      <Link
                        to="/forgot-password"
                        className="block w-full text-center text-[11px] tracking-[0.22em] uppercase text-silver/70 hover:text-[var(--gold)] transition-colors"
                      >
                        Forgot password?
                      </Link>
                    )}
                  </StaggerList>
                </form>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {phase === "signup-success" && (
              <SignupSuccessCard onReturn={returnToDeck} />
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 pt-5 border-t border-border flex items-center justify-between text-[10px] tracking-[0.22em] uppercase text-silver/60">
          <span>v4.2 · Encrypted Mesh</span>
          <span>PoP · Lagos · Frankfurt</span>
        </div>
      </div>

      <AnimatePresence>
        {phase === "authenticating" && <AuthenticatingOverlay />}
      </AnimatePresence>
    </div>
  );
}

function StaggerList({ children }: { children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children.flat().filter(Boolean) : [children];
  return (
    <>
      {arr.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 + i * 0.05, type: "spring", stiffness: 220, damping: 22 }}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}

function ShimmerButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="btn-gold-cta relative w-full overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] uppercase whitespace-nowrap disabled:opacity-60 cursor-pointer"
      style={{
        color: "oklch(0.10 0.02 265)",
        background:
          "linear-gradient(135deg, oklch(0.78 0.13 86), oklch(0.89 0.07 88))",
        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.4), 0 18px 40px -12px oklch(0.78 0.13 86 / 0.45)",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, oklch(1 0 0 / 0.45) 50%, transparent 70%)",
          backgroundSize: "220% 100%",
          animation: "lux-shimmer 2.6s linear infinite",
          mixBlendMode: "overlay",
        }}
      />
      <span className="relative z-10 inline-flex items-center gap-2">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {label}
      </span>
      <style>{`@keyframes lux-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </button>
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
    <label htmlFor={id} className="block">
      <span className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-silver/80 mb-1.5">
        {icon}
        {label}
      </span>
      <input
        id={id}
        type={type}
        required
        autoComplete={autoComplete ?? (type === "password" ? "current-password" : "email")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="lux-input w-full rounded-lg px-3.5 py-2.5 text-[13px] text-foreground"
      />
    </label>
  );
}
