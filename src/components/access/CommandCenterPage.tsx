import { Link } from "@tanstack/react-router";
import { Activity, ChevronRight, LogIn, UserPlus, Wallet } from "lucide-react";
import { EsoLogo } from "@/components/aura/EsoLogo";

type ProductId = "monitoring" | "esopay";

type ModuleCard = {
  id: ProductId;
  title: string;
  description: string;
  accent: string;
  border: string;
  icon: typeof Activity;
};

const MODULES: ModuleCard[] = [
  {
    id: "monitoring",
    title: "Eso Inverter Monitoring",
    description: "Real-time solar and generator intelligence for your fleet.",
    accent: "#00E5C0",
    border: "rgba(0, 229, 192, 0.28)",
    icon: Activity,
  },
  {
    id: "esopay",
    title: "Eso Pay Bills",
    description: "Premium wallet, Monnify settlements, and utility billing.",
    accent: "#D4AF37",
    border: "rgba(212, 175, 55, 0.32)",
    icon: Wallet,
  },
];

function ModuleActions({ product, accent }: { product: ProductId; accent: string }) {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <Link
        to="/login"
        search={{ product, mode: "signin" }}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:scale-[1.01]"
        style={{ borderColor: `${accent}55`, color: accent }}
      >
        <LogIn className="h-4 w-4" aria-hidden />
        Sign in
      </Link>
      <Link
        to="/login"
        search={{ product, mode: "signup" }}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-[#080C0C] transition hover:scale-[1.01]"
        style={{ backgroundColor: accent }}
      >
        <UserPlus className="h-4 w-4" aria-hidden />
        Sign up
      </Link>
    </div>
  );
}

export function CommandCenterPage() {
  return (
    <div className="deck-canvas min-h-screen px-5 py-10">
      <div className="mx-auto w-full max-w-lg">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-[11px] font-mono text-white/40 hover:text-white/70">
          ← Back to website
        </Link>

        <div className="mb-8 text-center">
          <EsoLogo size="md" variant="display" className="mx-auto" />
          <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[#D4AF37]/80">
            Enterprise platforms
          </p>
          <h1
            className="mt-3 text-[clamp(2rem,6vw,2.75rem)] leading-tight tracking-tight text-white"
            style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
          >
            Choose your{" "}
            <span className="italic text-[#00E5C0]">command center</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            Pick the ESO module you want, then sign in or request access. Each product runs
            independently with its own data and workflows.
          </p>
        </div>

        <div className="space-y-4">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <article
                key={module.id}
                className="relative overflow-hidden rounded-2xl border bg-[rgba(10,14,22,0.75)] p-5 backdrop-blur-xl"
                style={{ borderColor: module.border }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${module.accent}88, transparent)` }}
                />
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${module.accent}18` }}
                  >
                    <Icon size={22} color={module.accent} strokeWidth={2.1} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-white">{module.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">{module.description}</p>
                    {module.id === "esopay" ? (
                      <p className="mt-2 text-[11px] text-white/40">
                        Full wallet experience on mobile · web sign-in syncs your account
                      </p>
                    ) : null}
                    <ModuleActions product={module.id} accent={module.accent} />
                  </div>
                  <ChevronRight className="mt-1 hidden h-5 w-5 shrink-0 text-white/25 sm:block" aria-hidden />
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] text-white/40">
          Use your organization email · Monitoring uses password auth · Eso Pay uses the same identity
        </p>
      </div>
    </div>
  );
}
