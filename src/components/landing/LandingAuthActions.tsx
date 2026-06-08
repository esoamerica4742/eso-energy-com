import { Link } from "@tanstack/react-router";
import { LogIn, UserPlus, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  variant?: "header" | "hero" | "marketing";
};

export function LandingAuthActions({ variant = "hero" }: Props) {
  const { session, loading } = useAuth();
  const email = session?.user?.email;

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Sign out failed", { description: error.message });
      return;
    }
    toast.success("Signed out");
  };

  if (loading) {
    return (
      <span className="font-mono text-[10px] text-zinc-600" aria-live="polite">
        Checking session…
      </span>
    );
  }

  if (session) {
    if (variant === "header" || variant === "marketing") {
      const isMarketing = variant === "marketing";
      return (
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/dashboard"
            className={
              isMarketing
                ? "inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-[#080C0C] transition-all hover:scale-[1.02]"
                : "inline-flex items-center gap-1.5 rounded-lg border border-[#00F5D4]/30 bg-[#00F5D4]/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#00F5D4] transition hover:bg-[#00F5D4]/20"
            }
            style={isMarketing ? { backgroundColor: "#00E5C0" } : undefined}
          >
            <LayoutDashboard className={isMarketing ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-mono text-[10px] text-zinc-500 transition hover:text-zinc-300"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Out
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-[#00F5D4]/30 bg-[#00F5D4]/[0.06] p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#00F5D4]">
          Session active
        </p>
        <p className="mt-2 truncate text-sm text-white">{email}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#00F5D4] px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-black transition hover:brightness-110"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Open dashboard
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-400 transition hover:border-zinc-500 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (variant === "header" || variant === "marketing") {
    const isMarketing = variant === "marketing";
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          to="/access"
          className={
            isMarketing
              ? "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              : "inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          }
          style={
            isMarketing
              ? { borderColor: "rgba(0, 229, 192, 0.4)", color: "#00E5C0" }
              : undefined
          }
        >
          <LogIn className={isMarketing ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
          Sign in
        </Link>
        <Link
          to="/access"
          className={
            isMarketing
              ? "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              : "inline-flex items-center gap-1.5 rounded-lg border border-[#F5CB5C]/40 bg-[#F5CB5C]/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#F5CB5C] transition hover:bg-[#F5CB5C]/20"
          }
          style={
            isMarketing
              ? {
                  borderColor: "rgba(212, 175, 55, 0.45)",
                  backgroundColor: "rgba(212, 175, 55, 0.12)",
                  color: "#D4AF37",
                }
              : undefined
          }
        >
          <UserPlus className={isMarketing ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
        Sovereign access
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">
        Sign in to sync live inverter telemetry, or request access to the command deck.
      </p>
      <Link
        to="/access"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#00F5D4]/40 bg-[#00F5D4]/10 px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#00F5D4] transition hover:bg-[#00F5D4]/20"
      >
        Open command center
      </Link>
    </div>
  );
}
