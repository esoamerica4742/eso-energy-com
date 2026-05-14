import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  Radio,
  Trash2,
  UserRound,
  Wifi,
} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ConnectingModal } from "@/components/aura/ConnectingModal";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingWizard,
  head: () => ({
    meta: [
      { title: "Onboarding · EsoEnergy Systems" },
      { name: "description", content: "Provision your sovereign energy fleet in three premium steps." },
    ],
  }),
});

const STATES = [
  "Lagos",
  "Abuja FCT",
  "Rivers",
  "Kano",
  "Oyo",
  "Ogun",
  "Kaduna",
  "Enugu",
  "Delta",
  "Anambra",
];

const INVERTERS = ["Sunsynk", "Growatt", "Victron", "Deye", "SMA"];

type Branch = { id: string; name: string; state: string };

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(80),
  email: z.string().trim().email("Invalid work email").max(255),
  company: z.string().trim().min(2, "Company name is required").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+234\s?\d{3}\s?\d{3}\s?\d{4}$/, "Use +234 XXX XXX XXXX format"),
});

// ---------- Step indicator ----------

const STEPS = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "facilities", label: "Facilities", icon: Building2 },
  { key: "sync", label: "Sync", icon: Radio },
] as const;

function Stepper({ current }: { current: number }) {
  return (
    <ol className="relative flex items-center justify-between gap-2">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = done ? Check : s.icon;
        const color = done
          ? "oklch(0.78 0.17 165)"
          : active
            ? "oklch(0.86 0.02 255)"
            : "oklch(0.74 0.025 255 / 0.5)";
        return (
          <li key={s.key} className="flex-1 flex flex-col items-center relative">
            {i < STEPS.length - 1 && (
              <span
                className="absolute top-5 left-1/2 h-px w-full"
                style={{
                  background:
                    i < current
                      ? "linear-gradient(90deg, oklch(0.78 0.17 165), oklch(0.78 0.17 165 / 0.3))"
                      : "oklch(1 0 0 / 0.08)",
                }}
                aria-hidden
              />
            )}
            <motion.span
              layout
              className="relative z-10 grid h-10 w-10 place-items-center rounded-full hairline"
              style={{
                color,
                background: done
                  ? "oklch(0.30 0.10 165 / 0.35)"
                  : active
                    ? "oklch(0.22 0.02 265)"
                    : "oklch(0.18 0.012 265)",
                boxShadow: done
                  ? "inset 0 0 0 1px oklch(0.78 0.17 165 / 0.55), 0 0 24px oklch(0.78 0.17 165 / 0.4)"
                  : active
                    ? "inset 0 0 0 1px oklch(0.86 0.02 255 / 0.35), 0 0 18px oklch(0.86 0.02 255 / 0.25)"
                    : "inset 0 0 0 1px oklch(1 0 0 / 0.08)",
              }}
            >
              <Icon className="h-4 w-4" />
            </motion.span>
            <p
              className="mt-2 text-[10px] tracking-[0.22em] uppercase"
              style={{ color: done || active ? "oklch(0.86 0.02 255)" : "oklch(0.74 0.025 255 / 0.6)" }}
            >
              {s.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Reusable form bits ----------

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="text-[10px] tracking-[0.22em] uppercase text-silver/80">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[10px] text-silver/60">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg hairline bg-[oklch(0.16_0.015_265_/_0.6)] px-3.5 py-2.5 text-sm text-foreground placeholder:text-silver/50 outline-none transition focus:bg-[oklch(0.18_0.018_265_/_0.7)]";
const inputFocusStyle: React.CSSProperties = {};

// ---------- Step components ----------

function StepProfile({
  values,
  setValues,
  onNext,
}: {
  values: { fullName: string; email: string; company: string; phone: string; password: string };
  setValues: (v: typeof values) => void;
  onNext: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (values.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: values.fullName,
            company: values.company,
            phone: values.phone,
          },
        },
      });
      if (error) throw error;
      toast.success("Corporate profile secured", {
        description: `${values.company} · welcome aboard, ${values.fullName.split(" ")[0]}.`,
      });
      onNext();
    } catch (err: any) {
      toast.error("Account creation failed", { description: err?.message ?? "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="eyebrow">Step 01 · Identity</p>
        <h2 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">Corporate Profile</h2>
        <p className="mt-2 text-sm text-silver/80 max-w-md leading-relaxed">
          Establish your sovereign account. All fields encrypted in transit and at rest.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name" htmlFor="fullName">
          <input
            id="fullName"
            className={inputClass}
            placeholder="Adaeze Balogun"
            value={values.fullName}
            onChange={(e) => setValues({ ...values, fullName: e.target.value })}
            autoComplete="name"
          />
        </Field>
        <Field label="Work Email" htmlFor="email">
          <input
            id="email"
            type="email"
            className={inputClass}
            placeholder="adaeze@enterprise.com"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field label="Company Name" htmlFor="company">
          <input
            id="company"
            className={inputClass}
            placeholder="Access Bank Plc"
            value={values.company}
            onChange={(e) => setValues({ ...values, company: e.target.value })}
            autoComplete="organization"
          />
        </Field>
        <Field label="Phone Number" htmlFor="phone" hint="Format: +234 XXX XXX XXXX">
          <input
            id="phone"
            className={inputClass}
            placeholder="+234 802 555 1010"
            value={values.phone}
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
            autoComplete="tel"
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Password" htmlFor="password" hint="Minimum 8 characters">
            <input
              id="password"
              type="password"
              className={inputClass}
              placeholder="••••••••"
              value={values.password}
              onChange={(e) => setValues({ ...values, password: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <PrimaryButton submit loading={submitting}>
          {submitting ? "Securing account…" : "Create Account & Continue"}
          {!submitting && <ChevronRight className="h-4 w-4" />}
        </PrimaryButton>
      </div>
    </form>
  );
}

function StepFacilities({
  branches,
  setBranches,
  onBack,
  onNext,
}: {
  branches: Branch[];
  setBranches: (b: Branch[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  function addBranch() {
    setBranches([...branches, { id: crypto.randomUUID(), name: "", state: "" }]);
  }
  function removeBranch(id: string) {
    if (branches.length === 1) {
      toast.error("At least one facility is required");
      return;
    }
    setBranches(branches.filter((b) => b.id !== id));
  }
  function updateBranch(id: string, patch: Partial<Branch>) {
    setBranches(branches.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const b of branches) {
      if (!b.name.trim() || !b.state) {
        toast.error("Complete every branch", { description: "Site name and state are required." });
        return;
      }
    }
    toast.success(`${branches.length} ${branches.length === 1 ? "facility" : "facilities"} mapped`, {
      description: "Footprint locked into your fleet roster.",
    });
    onNext();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="eyebrow">Step 02 · Footprint</p>
        <h2 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">Facility Footprint</h2>
        <p className="mt-2 text-sm text-silver/80 max-w-md leading-relaxed">
          Map every branch we will orchestrate. You can edit, retire, or add nodes anytime.
        </p>
      </div>

      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {branches.map((b, idx) => (
            <motion.li
              key={b.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-xl hairline p-4"
              style={{ background: "linear-gradient(160deg, oklch(0.18 0.018 265 / 0.6), oklch(0.14 0.015 265 / 0.6))" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-silver/80">
                  <MapPin className="h-3 w-3" /> Branch {String(idx + 1).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => removeBranch(b.id)}
                  className="text-silver/60 hover:text-[oklch(0.85_0.18_25)] transition-colors p-1"
                  aria-label="Remove branch"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Branch / Site Name" htmlFor={`name-${b.id}`}>
                  <input
                    id={`name-${b.id}`}
                    className={inputClass}
                    placeholder="Victoria Island Hub"
                    value={b.name}
                    onChange={(e) => updateBranch(b.id, { name: e.target.value })}
                  />
                </Field>
                <Field label="State" htmlFor={`state-${b.id}`}>
                  <select
                    id={`state-${b.id}`}
                    className={inputClass + " appearance-none cursor-pointer"}
                    value={b.state}
                    onChange={(e) => updateBranch(b.id, { state: e.target.value })}
                  >
                    <option value="" disabled>Select state…</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <button
        type="button"
        onClick={addBranch}
        className="group flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-[12px] tracking-[0.16em] uppercase text-silver/80 transition-all hover:text-foreground hover:bg-[oklch(0.18_0.018_265_/_0.5)]"
        style={{ borderColor: "oklch(0.78 0.17 165 / 0.35)" }}
      >
        <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" style={{ color: "oklch(0.88 0.16 165)" }} />
        Add Another Branch
      </button>

      <div className="flex justify-between pt-2">
        <SecondaryButton onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> Back
        </SecondaryButton>
        <PrimaryButton submit>
          Continue <ChevronRight className="h-4 w-4" />
        </PrimaryButton>
      </div>
    </form>
  );
}

function StepSync({
  values,
  setValues,
  onBack,
  onComplete,
}: {
  values: { brand: string; serial: string; accountEmail: string; accountPassword: string };
  setValues: (v: typeof values) => void;
  onBack: () => void;
  onComplete: (generatedSerial: string) => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [generatedSerial, setGeneratedSerial] = useState<string>("");

  function generateDongleSerial(brand: string) {
    const prefix = (brand || "DGL").slice(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const rand = Array.from({ length: 6 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
    ).join("");
    return `${prefix}-${year}-${rand}`;
  }

  function handleSync(e: React.FormEvent) {
    e.preventDefault();
    if (!values.brand) return toast.error("Select your inverter brand");
    if (!values.accountEmail.trim()) return toast.error("Enter your manufacturer account email");
    if (values.accountPassword.length < 4) return toast.error("Enter your account password");
    const serial = generateDongleSerial(values.brand);
    setGeneratedSerial(serial);
    setValues({ ...values, serial });
    setSyncing(true);
  }

  function handleConnectionComplete() {
    setSyncing(false);
    toast.success("Remote sync established", {
      description: `Dongle ${generatedSerial} bonded to your fleet mesh.`,
    });
    onComplete(generatedSerial);
  }

  return (
    <>
    <ConnectingModal open={syncing} onComplete={handleConnectionComplete} />
    <form onSubmit={handleSync} className="space-y-5">
      <div>
        <p className="eyebrow">Step 03 · Telemetry</p>
        <h2 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">Instant Remote Sync</h2>
        <p className="mt-2 text-sm text-silver/80 max-w-lg leading-relaxed font-light">
          No hardware installation or wiring changes required. Connect via your current inverter
          Wi-Fi gateway module.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Inverter Brand" htmlFor="brand">
          <select
            id="brand"
            className={inputClass + " appearance-none cursor-pointer"}
            value={values.brand}
            onChange={(e) => setValues({ ...values, brand: e.target.value })}
          >
            <option value="" disabled>Select inverter brand…</option>
            {INVERTERS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </Field>
      </div>

      <AnimatePresence initial={false}>
        {values.brand && (
          <motion.div
            key="creds"
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <Field label={`${values.brand} Account Email / Username`} htmlFor="accountEmail">
                <input
                  id="accountEmail"
                  className={inputClass}
                  placeholder="operator@enterprise.com"
                  value={values.accountEmail}
                  onChange={(e) => setValues({ ...values, accountEmail: e.target.value })}
                  autoComplete="off"
                />
              </Field>
              <Field label="Account Password" htmlFor="accountPassword">
                <input
                  id="accountPassword"
                  type="password"
                  className={inputClass}
                  placeholder="••••••••"
                  value={values.accountPassword}
                  onChange={(e) => setValues({ ...values, accountPassword: e.target.value })}
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <div
              className="mt-4 flex items-start gap-2.5 rounded-lg hairline px-3.5 py-3"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.30 0.10 165 / 0.18), oklch(0.18 0.018 265 / 0.4))",
              }}
            >
              <span className="text-sm leading-none mt-0.5">🔒</span>
              <p className="text-[10.5px] leading-relaxed tracking-[0.04em] text-silver/85 font-light">
                <span className="text-foreground font-medium">Secured with 256-bit Enterprise Encryption.</span>{" "}
                Your credentials are used solely to establish the initial API token handshake and are
                <span className="text-foreground"> never stored on our servers</span>.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync visual */}
      <div className="flex justify-center pt-4">
        <button
          type="submit"
          disabled={syncing}
          className="group relative inline-flex items-center gap-3 rounded-full px-7 py-4 text-[12px] font-semibold tracking-[0.18em] uppercase transition-all hover:-translate-y-0.5 disabled:cursor-wait"
          style={{
            color: "oklch(0.13 0.003 265)",
            background: "linear-gradient(135deg, oklch(0.88 0.16 165), oklch(0.78 0.17 165))",
            boxShadow:
              "inset 0 1px 0 oklch(1 0 0 / 0.45), 0 12px 36px oklch(0.78 0.17 165 / 0.45), 0 0 0 0 oklch(0.78 0.17 165 / 0.55)",
            animation: syncing ? "none" : "sync-pulse 2.4s ease-out infinite",
          }}
        >
          <span className="relative grid h-6 w-6 place-items-center">
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Wifi className="h-4 w-4" />
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: "0 0 0 0 oklch(0.13 0.003 265 / 0.35)",
                    animation: "sync-ring 2.4s ease-out infinite",
                  }}
                  aria-hidden
                />
              </>
            )}
          </span>
          {syncing ? "Establishing handshake…" : "Initialize Remote Connection"}
        </button>
      </div>

      <style>{`
        @keyframes sync-pulse {
          0%, 100% { box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.45), 0 12px 36px oklch(0.78 0.17 165 / 0.45), 0 0 0 0 oklch(0.78 0.17 165 / 0.55); }
          50%      { box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.45), 0 12px 36px oklch(0.78 0.17 165 / 0.55), 0 0 0 14px oklch(0.78 0.17 165 / 0); }
        }
        @keyframes sync-ring {
          0%   { box-shadow: 0 0 0 0 oklch(0.13 0.003 265 / 0.5); }
          100% { box-shadow: 0 0 0 14px oklch(0.13 0.003 265 / 0); }
        }
      `}</style>

      <div className="flex justify-between pt-2">
        <SecondaryButton onClick={onBack} disabled={syncing}>
          <ChevronLeft className="h-4 w-4" /> Back
        </SecondaryButton>
        <button
          type="button"
          onClick={() => onComplete("")}
          disabled={syncing}
          className="text-[11px] tracking-[0.22em] uppercase text-silver/70 hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </form>
    </>
  );
}

// ---------- Buttons ----------

function PrimaryButton({
  children,
  submit,
  loading,
  onClick,
}: {
  children: React.ReactNode;
  submit?: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={submit ? "submit" : "button"}
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-semibold tracking-[0.16em] uppercase transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait disabled:hover:translate-y-0"
      style={{
        color: "oklch(0.13 0.003 265)",
        background: "linear-gradient(135deg, oklch(0.78 0.13 86), oklch(0.89 0.07 88))",
        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.4), 0 8px 24px oklch(0.78 0.13 86 / 0.4)",
      }}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full hairline px-4 py-2.5 text-[11px] font-semibold tracking-[0.16em] uppercase text-silver hover:text-foreground transition-colors disabled:opacity-50"
      style={{ background: "oklch(0.18 0.018 265 / 0.5)" }}
    >
      {children}
    </button>
  );
}

// ---------- Wizard shell ----------

function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    company: "",
    phone: "+234 ",
    password: "",
  });
  const [branches, setBranches] = useState<Branch[]>([
    { id: crypto.randomUUID(), name: "", state: "" },
  ]);
  const [sync, setSync] = useState({ brand: "", serial: "", accountEmail: "", accountPassword: "" });

  function complete(generatedSerial?: string) {
    toast.success("Onboarding complete", {
      description: generatedSerial
        ? `Dongle ${generatedSerial} bonded · routing to the Command Deck…`
        : "Routing you to the Command Deck…",
    });
    setTimeout(() => navigate({ to: "/" }), 900);
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden"
      style={{
        background:
          "radial-gradient(80% 60% at 20% 10%, oklch(0.62 0.20 282 / 0.18), transparent 60%), radial-gradient(60% 50% at 90% 90%, oklch(0.78 0.13 86 / 0.10), transparent 60%), oklch(0.13 0.003 265)",
      }}
    >
      {/* Ambient grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.86 0.02 255) 1px, transparent 1px), linear-gradient(90deg, oklch(0.86 0.02 255) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full max-w-3xl">
        <div className="mb-6 text-center">
          <p className="eyebrow">EsoEnergy Systems · Provisioning</p>
          <h1 className="mt-1 text-3xl md:text-[34px] font-semibold tracking-tight">
            <span className="shimmer-text">Welcome to your sovereign mesh</span>
          </h1>
        </div>

        <div className="glass-card p-6 md:p-10">
          <Stepper current={step} />

          <div className="mt-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {step === 0 && (
                  <StepProfile
                    values={profile}
                    setValues={setProfile}
                    onNext={() => setStep(1)}
                  />
                )}
                {step === 1 && (
                  <StepFacilities
                    branches={branches}
                    setBranches={setBranches}
                    onBack={() => setStep(0)}
                    onNext={() => setStep(2)}
                  />
                )}
                {step === 2 && (
                  <StepSync
                    values={sync}
                    setValues={setSync}
                    onBack={() => setStep(1)}
                    onComplete={complete}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] tracking-[0.32em] uppercase text-silver/60">
          AES-256 · End-to-end encrypted handshake
        </p>
      </div>
    </div>
  );
}
