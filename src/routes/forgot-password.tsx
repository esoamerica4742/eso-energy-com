import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { EsoLogo } from "@/components/aura/EsoLogo";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Forgot password · EsoEnergy Systems" },
      { name: "description", content: "Recover access to your EsoEnergy Systems command deck." },
    ],
  }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) {
      setErr("Enter the email tied to your account.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not send reset email");
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

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="mt-1.5 text-[12px] tracking-wide text-silver/80">
          {sent
            ? "If that email is registered, a recovery link is on its way."
            : "Enter your email and we'll send you a secure recovery link."}
        </p>

        {!sent ? (
          <form onSubmit={submit} className="mt-6 sm:mt-7 space-y-4">
            <label htmlFor="email" className="block">
              <span className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-silver/80 mb-1.5">
                <Mail className="h-3.5 w-3.5 text-silver" />
                Email
              </span>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@bank.ng"
                className="w-full rounded-lg hairline bg-[oklch(0.13_0.003_265_/_0.6)] px-3.5 py-2.5 text-[13px] text-foreground placeholder:text-silver/40 focus:outline-none focus:ring-2 focus:ring-[oklch(0.62_0.20_282_/_0.5)] transition-shadow"
              />
            </label>

            {err && (
              <p className="text-[12px] text-[oklch(0.85_0.18_25)] hairline rounded-md px-3 py-2 bg-[oklch(0.30_0.10_25_/_0.18)]">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
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
              Send recovery link
            </button>
          </form>
        ) : (
          <div className="mt-6 sm:mt-7 space-y-4">
            <p className="text-[12px] text-[var(--gold)] hairline rounded-md px-3 py-2 bg-[oklch(0.30_0.10_165_/_0.18)]">
              Sent to <span className="font-semibold">{email}</span>. Check your inbox and spam folder.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="w-full rounded-xl px-4 py-3 text-[12px] font-semibold tracking-[0.22em] uppercase hairline bg-[oklch(0.13_0.02_265_/_0.6)] text-silver hover:text-[var(--gold)] transition-colors"
            >
              Send to another address
            </button>
          </div>
        )}

        <Link
          to="/login"
          className="mt-5 inline-flex items-center justify-center gap-1.5 w-full text-[11px] tracking-[0.22em] uppercase text-silver/70 hover:text-[var(--gold)] transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to sign in
        </Link>

        <div className="mt-7 sm:mt-8 pt-5 border-t border-border flex items-center justify-between text-[10px] tracking-[0.22em] uppercase text-silver/60">
          <span>v4.2 · Encrypted Mesh</span>
          <span>PoP · Lagos · Frankfurt</span>
        </div>
      </div>
    </div>
  );
}
