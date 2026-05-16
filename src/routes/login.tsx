import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, Mail, ShieldCheck, User, Building2 } from "lucide-react";
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
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "authenticating" | "signup-success">("idle");
  const [ctaLabel, setCtaLabel] = useState<string | null>(null);

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
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setCtaLabel("ESTABLISHING SECURE PROTOCOLS…");
    // Brief cinematic delay so the progress rail registers
    await new Promise((r) => setTimeout(r, 650));
    try {
      if (mode === "signin") {
        if (!email || !password) throw new Error("Email and password are required.");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setPhase("authenticating");
      } else {
        if (!fullName.trim()) throw new Error("Please enter your full name.");
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName.trim(), company: company.trim() },
          },
        });
        if (error) throw error;
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
                initial={{ x: 50 * direction, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50 * direction, opacity: 0 }}
                transition={{ type: "spring", stiffness: 130, damping: 16 }}
              >
                <h1
                  className="text-[28px] md:text-[30px] leading-[1.1] tracking-tight text-white"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 500 }}
                >
                  {isSignin ? "Sign in to your command deck" : "Request operator access"}
                </h1>
                <p className="mt-2 text-[12.5px] text-white/55 leading-relaxed">
                  {isSignin
                    ? "Sovereign telemetry · encrypted by default."
                    : "Provision a new operator in under 30 seconds."}
                </p>

                <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
                  <Stagger>
                    {!isSignin && (
                      <Field
                        id="fullName"
                        type="text"
                        label="Full Name"
                        value={fullName}
                        onChange={setFullName}
                        autoComplete="name"
                        icon={<User className="h-4 w-4" />}
                        placeholder="Ada Lovelace"
                      />
                    )}
                    {!isSignin && (
                      <Field
                        id="company"
                        type="text"
                        label="Company"
                        value={company}
                        onChange={setCompany}
                        autoComplete="organization"
                        icon={<Building2 className="h-4 w-4" />}
                        placeholder="EsoEnergy Holdings"
                      />
                    )}
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
                      autoComplete={isSignin ? "current-password" : "new-password"}
                      icon={<Lock className="h-4 w-4" />}
                      placeholder={isSignin ? "••••••••••" : "At least 8 characters"}
                    />

                    <button type="submit" disabled={busy} className="deck-cta mt-2">
                      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>
                        {ctaLabel
                          ? ctaLabel
                          : isSignin
                            ? "Initialize Command Flow"
                            : "Submit Access Request"}
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
            </AnimatePresence>
          </motion.div>

          <AnimatePresence>
            {phase === "signup-success" && <SignupSuccessCard onReturn={returnToDeck} />}
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
