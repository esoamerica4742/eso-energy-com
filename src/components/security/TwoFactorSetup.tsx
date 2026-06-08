/**
 * 2FA setup UI — QR display, verification, backup codes.
 * WHY: Secret shown once from API; only encrypted blob ever hits the database.
 */
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Shield, Copy, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SetupPayload = {
  otpauthUrl: string;
  secret: string;
  backupCodes: string[];
};

export function TwoFactorSetup({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<"idle" | "qr" | "backup">("idle");
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");

  const startSetup = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/auth/totp/setup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (!res.ok) throw new Error("Setup failed");
      const payload = (await res.json()) as SetupPayload;
      setSetup(payload);
      setStep("qr");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/auth/totp/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: code, mode: "setup" }),
      });
      if (!res.ok) throw new Error("Invalid code");
      setStep("backup");
      toast.success("Two-factor authentication enabled");
    } catch {
      toast.error("Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (!setup?.backupCodes) return;
    void navigator.clipboard.writeText(setup.backupCodes.join("\n"));
    toast.success("Backup codes copied");
  };

  const downloadBackupCodes = () => {
    if (!setup?.backupCodes) return;
    const blob = new Blob([setup.backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "eso-energy-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-6">
      <div className="flex items-center gap-2 text-[#e5b974] mb-4">
        <Shield className="h-5 w-5" />
        <h3 className="text-lg font-medium text-white">Authenticator App (2FA)</h3>
      </div>

      {step === "idle" && (
        <button
          type="button"
          onClick={startSetup}
          disabled={loading}
          className="deck-cta w-full"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable 2FA"}
        </button>
      )}

      {step === "qr" && setup && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-white/60">
            Scan with Google Authenticator, Authy, or 1Password
          </p>
          <div className="inline-block rounded-lg bg-white p-3">
            <QRCodeSVG value={setup.otpauthUrl} size={180} />
          </div>
          <p className="font-mono text-xs text-white/50 break-all">{setup.secret}</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="deck-input text-center tracking-[0.5em] max-w-[200px] mx-auto block"
          />
          <button
            type="button"
            onClick={verifyCode}
            disabled={loading || code.length !== 6}
            className="deck-cta w-full"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Enable"}
          </button>
        </div>
      )}

      {step === "backup" && setup && (
        <div className="space-y-4">
          <p className="text-sm text-amber-400/90">
            Save these backup codes securely. Each works once.
          </p>
          <pre className="rounded-lg bg-black/60 p-4 text-xs font-mono text-white/80">
            {setup.backupCodes.join("\n")}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyBackupCodes}
              className="deck-cta flex-1 flex items-center justify-center gap-2"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
            <button
              type="button"
              onClick={downloadBackupCodes}
              className="deck-cta flex-1 flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
          <button
            type="button"
            onClick={() => onComplete?.()}
            className="w-full text-sm text-white/50 hover:text-[#e5b974]"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
