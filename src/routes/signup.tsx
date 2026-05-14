import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldCheck, Lock, Mail, User } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
  head: () => ({
    meta: [
      { title: "Create account · EsoEnergy Systems" },
      { name: "description", content: "Provision a new operator on the EsoEnergy Systems command deck." },
    ],
  }),
});

type Strength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  checks: { len: boolean; lower: boolean; upper: boolean; digit: boolean; symbol: boolean };
};

const MIN_ACCEPTABLE_SCORE = 3;

function scorePassword(pw: string): Strength {
  const checks = {
    len: pw.length >= 8,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  let score: Strength["score"] = 0;
  if (pw.length === 0) score = 0;
  else if (passed <= 2 || pw.length < 8) score = 1;
  else if (passed === 3) score = 2;
  else if (passed === 4) score = 3;
  else score = 4;
  if (pw.length >= 14 && score < 4) score = (score + 1) as Strength["score"];

  const labels = ["", "Too weak", "Fair", "Strong", "Excellent"];
  const colors = [
    "oklch(0.30 0.03 265)",
    "oklch(0.65 0.20 25)",
    "oklch(0.78 0.16 75)",
    "oklch(0.78 0.17 165)",
    "oklch(0.85 0.16 165)",
  ];
  return { score, label: labels[score], color: colors[score], checks };
}

function StrengthMeter({ strength }: { strength: Strength }) {
  const { score, label, color, checks } = strength;
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{ background: i <= score ? color : "oklch(0.25 0.03 265 / 0.5)" }}
          />
        ))}
      </div>
      {score > 0 && (
        <div className="flex items-center justify-between text-[10px] tracking-[0.22em] uppercase">
          <span style={{ color }}>{label}</span>
          <span className="text-silver/60">
            {score >= MIN_ACCEPTABLE_SCORE ? "Acceptable" : "Strengthen to continue"}
          </span>
        </div>
      )}
      {score > 0 && score < MIN_ACCEPTABLE_SCORE && (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-silver/70">
          <Req ok={checks.len} text="8+ characters" />
          <Req ok={checks.upper} text="Uppercase" />
          <Req ok={checks.lower} text="Lowercase" />
          <Req ok={checks.digit} text="Number" />
          <Req ok={checks.symbol} text="Symbol" />
        </ul>
      )}
    </div>
  );
}

function Req({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: ok ? "oklch(0.78 0.17 165)" : "oklch(0.40 0.03 265)" }}
      />
      <span className={ok ? "text-[var(--gold)]" : ""}>{text}</span>
    </li>
  );
}

function SignUpPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  const strength = scorePassword(password);
  const passwordOk = strength.score >= MIN_ACCEPTABLE_SCORE;
  const confirmTouched = confirm.length > 0;
  const passwordsMatch = password === confirm && confirmTouched;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      if (!fullName.trim()) throw new Error("Please enter your full name");
      if (!passwordOk) throw new Error("Password is too weak. Strengthen it to continue.");
      if (!passwordsMatch) throw new Error("Passwords do not match.");
      if (!acceptedTerms || !acceptedPrivacy)
        throw new Error("You must accept the Terms of Service and Privacy Policy.");
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName.trim() },
        },
      });
      if (error) throw error;
      if (data.session) {
        navigate({ to: "/" });
      } else {
        setInfo("Check your inbox to verify your email, then sign in.");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-10"
      style={{
        background:
          "radial-gradient(1100px 600px at 20% 0%, oklch(0.62 0.20 282 / 0.18), transparent 60%), radial-gradient(900px 500px at 100% 100%, oklch(0.78 0.13 86 / 0.10), transparent 60%), oklch(0.13 0.003 265)",
      }}
    >
      <div
        className="w-full max-w-md glass-card p-8 md:p-10"
        style={{ boxShadow: "0 30px 80px -20px oklch(0 0 0 / 0.7), inset 0 1px 0 oklch(1 0 0 / 0.08)" }}
      >
        <Link to="/signup" className="inline-flex items-center gap-3 mb-8">
          <span
            className="h-10 w-10 rounded-xl grid place-items-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.22 0.008 265), oklch(0.16 0.005 265))",
              boxShadow: "0 0 24px oklch(0.78 0.13 86 / 0.35), inset 0 0 0 1px oklch(0.78 0.13 86 / 0.4)",
            }}
          >
            <ShieldCheck className="h-5 w-5 text-[var(--gold)]" />
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-[0.18em] text-silver">AURA</p>
            <p className="text-[10px] tracking-[0.32em] text-silver/70 uppercase">Enterprise · New Operator</p>
          </div>
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-[12px] tracking-wide text-silver/80">
          Provision sovereign access in under 30 seconds.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
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
          <Field
            id="email"
            type="email"
            label="Email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            icon={<Mail className="h-3.5 w-3.5 text-silver" />}
            placeholder="operator@bank.ng"
          />
          <Field
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            icon={<Lock className="h-3.5 w-3.5 text-silver" />}
            placeholder="At least 8 characters"
          />
          {password.length > 0 && <StrengthMeter strength={strength} />}
          <Field
            id="confirm"
            type="password"
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            icon={<Lock className="h-3.5 w-3.5 text-silver" />}
            placeholder="Repeat password"
          />
          {confirmTouched && (
            <p
              className="text-[10px] tracking-[0.22em] uppercase"
              style={{
                color: passwordsMatch ? "oklch(0.85 0.16 165)" : "oklch(0.75 0.18 25)",
              }}
            >
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </p>
          )}

          <div className="space-y-2.5 pt-1">
            <Consent
              id="accept-terms"
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
              label={
                <>
                  I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--gold)] underline-offset-2 hover:underline"
                  >
                    Terms of Service
                  </a>
                  .
                </>
              }
            />
            <Consent
              id="accept-privacy"
              checked={acceptedPrivacy}
              onChange={setAcceptedPrivacy}
              label={
                <>
                  I have read the{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--gold)] underline-offset-2 hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </>
              }
            />
          </div>

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

          <button
            type="submit"
            disabled={busy || !passwordOk || !passwordsMatch || !acceptedTerms || !acceptedPrivacy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[12px] font-semibold tracking-[0.22em] uppercase transition-all disabled:opacity-60"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.78 0.13 86), oklch(0.89 0.07 88))",
              color: "oklch(0.10 0.02 265)",
              boxShadow:
                "inset 0 1px 0 oklch(1 0 0 / 0.4), 0 18px 40px -12px oklch(0.78 0.13 86 / 0.45)",
            }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Create Account
          </button>
        </form>

        <Link
          to="/login"
          className="mt-5 block w-full text-center text-[11px] tracking-[0.22em] uppercase text-silver/70 hover:text-[var(--gold)] transition-colors"
        >
          Already an operator? Sign in →
        </Link>

        <div className="mt-8 pt-5 border-t border-border flex items-center justify-between text-[10px] tracking-[0.22em] uppercase text-silver/60">
          <span>v4.2 · Encrypted Mesh</span>
          <span>PoP · Lagos · Frankfurt</span>
        </div>
      </div>
    </div>
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
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg hairline bg-[oklch(0.13_0.003_265_/_0.6)] px-3.5 py-2.5 text-[13px] text-foreground placeholder:text-silver/40 focus:outline-none focus:ring-2 focus:ring-[oklch(0.62_0.20_282_/_0.5)] transition-shadow"
      />
    </label>
  );
}

function Consent({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="mt-0.5 grid place-items-center h-4 w-4 shrink-0 rounded-[5px] hairline bg-[oklch(0.13_0.003_265_/_0.6)] transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[oklch(0.62_0.20_282_/_0.5)]"
        style={
          checked
            ? {
                background:
                  "linear-gradient(135deg, oklch(0.78 0.13 86), oklch(0.89 0.07 88))",
                boxShadow: "0 0 0 1px oklch(0.78 0.13 86 / 0.7)",
              }
            : undefined
        }
      >
        {checked && (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="oklch(0.10 0.02 265)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5L6.5 12L13 4.5" />
          </svg>
        )}
      </span>
      <span className="text-[12px] leading-snug text-silver/85">{label}</span>
    </label>
  );
}
