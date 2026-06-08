import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  productDestination,
  productFromUserMetadata,
  resolveAuthProduct,
  type AuthProduct,
} from "@/lib/auth/productRedirect";
import { EsoLogo } from "@/components/aura/EsoLogo";

type CallbackSearch = {
  product?: AuthProduct;
  code?: string;
  token_hash?: string;
  type?: string;
};

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    product: resolveAuthProduct(search.product),
    code: typeof search.code === "string" ? search.code : undefined,
    token_hash: typeof search.token_hash === "string" ? search.token_hash : undefined,
    type: typeof search.type === "string" ? search.type : undefined,
  }),
  component: AuthCallbackPage,
  head: () => ({
    meta: [{ title: "Confirming account · ESO Energy" }],
  }),
});

async function establishSessionFromUrl(search: CallbackSearch): Promise<{ error: Error | null }> {
  if (search.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(search.code);
    return { error: error ?? null };
  }

  if (search.token_hash && search.type) {
    type OtpType = "signup" | "email" | "recovery" | "invite" | "magiclink" | "email_change";
    const allowed: OtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];
    const otpType: OtpType = allowed.includes(search.type as OtpType)
      ? (search.type as OtpType)
      : "signup";
    const { error } = await supabase.auth.verifyOtp({
      token_hash: search.token_hash,
      type: otpType,
    });
    return { error: error ?? null };
  }

  const { error } = await supabase.auth.getSession();
  return { error: error ?? null };
}

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { error: sessionError } = await establishSessionFromUrl(search);
      if (cancelled) return;

      if (sessionError) {
        setMessage(sessionError.message || "Could not verify your email. Try signing in again.");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!data.session) {
        setMessage("Email verified, but no session was created. Please sign in with your password.");
        return;
      }

      const metaProduct = productFromUserMetadata(data.session.user.user_metadata);
      const product = search.product ?? metaProduct ?? "monitoring";
      navigate({ to: productDestination(product), replace: true });
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate, search]);

  const failed = message !== "Verifying your email…";

  return (
    <div className="deck-canvas flex min-h-screen items-center justify-center px-5 py-10">
      <div className="deck-card max-w-md px-8 py-10 text-center">
        <EsoLogo size="md" variant="display" className="mx-auto" />
        {!failed ? (
          <Loader2 className="mx-auto mt-8 h-8 w-8 animate-spin text-[#14b8a6]" />
        ) : null}
        <p className="mt-6 text-sm leading-relaxed text-white/70">{message}</p>
        {failed ? (
          <button
            type="button"
            onClick={() => navigate({ to: "/access" })}
            className="mt-6 text-[11px] font-mono uppercase tracking-wider text-[#D4AF37] hover:text-[#e5c76b]"
          >
            ← Back to command center
          </button>
        ) : null}
      </div>
    </div>
  );
}
