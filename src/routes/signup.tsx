import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShieldCheck, Lock, Mail, User } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
  head: () => ({
    meta: [
      { title: "Create account · AURA Enterprise" },
      { name: "description", content: "Provision a new operator on the AURA Enterprise command deck." },
    ],
  }),
});

function SignUpPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      if (!fullName.trim()) throw new Error("Please enter your full name");
      if (password.length < 8) throw new Error("Password must be at least 8 characters");
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
          "radial-gradient(1100px 600px at 20% 0%, oklch(0.22 0.06 265 / 0.55), transparent 60%), radial-gradient(900px 500px at 100% 100%, oklch(0.20 0.05 175 / 0.35), transparent 60%), oklch(0.10 0.02 265)",
      }}
    >
      <div
        className="w-full max-w-md glass-card p-8 md:p-10"
        style={{ boxShadow: "0 30px 80px -20px oklch(0 0 0 / 0.7), inset 0 0 0 1px oklch(0.30 0.03 265 / 0.5)" }}
      >
        <Link to="/signup" className="inline-flex items-center gap-3 mb-8">
          <span
            className="h-10 w-10 rounded-xl grid place-items-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.32 0.05 265), oklch(0.18 0.03 265))",
              boxShadow: "0 0 24px oklch(0.74 0.17 165 / 0.35), inset 0 0 0 1px oklch(0.74 0.17 165 / 0.4)",
            }}
          >
            <ShieldCheck className="h-5 w-5 text-[oklch(0.85_0.16_165)]" />
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

          {err && (
            <p className="text-[12px] text-[oklch(0.85_0.18_25)] hairline rounded-md px-3 py-2 bg-[oklch(0.30_0.10_25_/_0.18)]">
              {err}
            </p>
          )}
          {info && (
            <p className="text-[12px] text-[oklch(0.85_0.16_165)] hairline rounded-md px-3 py-2 bg-[oklch(0.30_0.10_165_/_0.18)]">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[12px] font-semibold tracking-[0.22em] uppercase transition-all disabled:opacity-60"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.78 0.17 165 / 0.95), oklch(0.62 0.15 195 / 0.95))",
              color: "oklch(0.10 0.02 265)",
              boxShadow:
                "0 0 0 1px oklch(0.74 0.17 165 / 0.6), 0 18px 40px -12px oklch(0.74 0.17 165 / 0.55)",
            }}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Create Account
          </button>
        </form>

        <Link
          to="/login"
          className="mt-5 block w-full text-center text-[11px] tracking-[0.22em] uppercase text-silver/70 hover:text-[oklch(0.85_0.16_165)] transition-colors"
        >
          Already an operator? Sign in →
        </Link>

        <div className="mt-8 pt-5 border-t border-[oklch(0.30_0.03_265_/_0.5)] flex items-center justify-between text-[10px] tracking-[0.22em] uppercase text-silver/60">
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
        className="w-full rounded-lg hairline bg-[oklch(0.13_0.02_265_/_0.7)] px-3.5 py-2.5 text-[13px] text-foreground placeholder:text-silver/40 focus:outline-none focus:ring-2 focus:ring-[oklch(0.74_0.17_165_/_0.4)] transition-shadow"
      />
    </label>
  );
}
