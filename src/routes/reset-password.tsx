import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, Lock } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset password · AURA Enterprise" },
      { name: "description", content: "Set a new password for your AURA Enterprise account." },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Wait for Supabase to detect the recovery token in the URL hash and emit
  // a PASSWORD_RECOVERY event before allowing the form to submit.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setInfo("Password updated. Redirecting to your command deck…");
      setTimeout(() => navigate({ to: "/" }), 1200);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-5 sm:py-10"
      style={{
        background:
          "radial-gradient(1100px 600px at 20% 0%, oklch(0.62 0.20 282 / 0.18), transparent 60%), radial-gradient(900px 500px at 100% 100%, oklch(0.78 0.13 86 / 0.10), transparent 60%), oklch(0.13 0.003 265)",
      }}
    >
      <div
        className="w-full max-w-md glass-card p-6 sm:p-8 md:p-10"
        style={{ boxShadow: "0 30px 80px -20px oklch(0 0 0 / 0.7), inset 0 1px 0 oklch(1 0 0 / 0.08)" }}
      >
        <div className="inline-flex items-center gap-3 mb-6 sm:mb-8">
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
            <p className="text-[10px] tracking-[0.32em] text-silver/70 uppercase">Enterprise · Recovery</p>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1.5 text-[12px] tracking-wide text-silver/80">
          {ready
            ? "Choose a strong password for your operator account."
            : "Verifying your recovery link…"}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <Field
            id="password"
            label="New password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
          />
          <Field
            id="confirm"
            label="Confirm password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repeat new password"
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

          <button
            type="submit"
            disabled={busy || !ready}
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
            Update password
          </button>
        </form>

        <Link
          to="/login"
          className="mt-5 block w-full text-center text-[11px] tracking-[0.22em] uppercase text-silver/70 hover:text-[var(--gold)] transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-silver/80 mb-1.5">
        <Lock className="h-3.5 w-3.5 text-silver" />
        {label}
      </span>
      <input
        id={id}
        type="password"
        required
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg hairline bg-[oklch(0.13_0.003_265_/_0.6)] px-3.5 py-2.5 text-[13px] text-foreground placeholder:text-silver/40 focus:outline-none focus:ring-2 focus:ring-[oklch(0.62_0.20_282_/_0.5)] transition-shadow"
      />
    </label>
  );
}
