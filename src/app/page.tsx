import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import {
  motion,
  useInView,
  type Variants,
} from "framer-motion";
import { Clock, TrendingUp, Zap } from "lucide-react";
import { LandingAuthActions } from "@/components/landing/LandingAuthActions";

/* ─── Design tokens (CSS custom properties) ─── */
const TOKENS = {
  bg: "#080C0C",
  teal: "#00E5C0",
  amber: "#D4AF37",
  muted: "#A0ADA8",
  glass: "rgba(255,255,255,0.05)",
  glassBorder: "rgba(255,255,255,0.08)",
} as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useCountUp(target: number, active: boolean, duration = 2000, decimals = 1) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(target * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(tick);
    };
    setValue(0);
    requestAnimationFrame(tick);
  }, [active, target, duration]);

  const formatted =
    decimals === 0
      ? Math.round(value).toString()
      : value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return formatted;
}

function CountUpStat({
  target,
  suffix = "",
  decimals = 1,
  className,
  style,
}: {
  target: number;
  suffix?: string;
  decimals?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const display = useCountUp(target, inView, 2000, decimals);

  return (
    <span ref={ref} className={className} style={style}>
      {display}
      {suffix}
    </span>
  );
}

const LOGOS = [
  "Dangote Group",
  "MTN Business",
  "TotalEnergies",
  "Zenith Bank",
  "Julius Berger",
  "Flour Mills",
];

const STEPS = [
  {
    n: "01",
    accent: TOKENS.teal,
    title: "Connect your assets",
    body: "Link your inverters, solar arrays, and generators in under 48 hours. No hardware changes needed.",
  },
  {
    n: "02",
    accent: TOKENS.amber,
    title: "Eso orchestrates in real time",
    body: "Our AI monitors, balances, and optimizes your entire energy stack — 24/7, automatically.",
  },
  {
    n: "03",
    accent: TOKENS.teal,
    title: "See savings immediately",
    body: "Real-time ledger shows cost reduction from day one. Full visibility, zero guesswork.",
  },
];

const STATS = [
  { value: 1.2, suffix: " GWh", decimals: 1, label: "Total Generated", accent: TOKENS.teal, Icon: Zap, ghost: "01" },
  { value: 99.4, suffix: "%", decimals: 1, label: "Platform Uptime", accent: TOKENS.amber, Icon: TrendingUp, ghost: "02" },
  { value: 48, suffix: "hrs", decimals: 0, label: "Average Setup Time", accent: TOKENS.teal, Icon: Clock, ghost: "03" },
];

function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] opacity-[0.03] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

export default function SovereignLandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToStats = useCallback(() => {
    document.getElementById("platform-stats")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden text-[#F0F4FF] antialiased"
      style={
        {
          ["--eso-bg" as string]: TOKENS.bg,
          ["--eso-teal" as string]: TOKENS.teal,
          ["--eso-amber" as string]: TOKENS.amber,
          ["--eso-muted" as string]: TOKENS.muted,
          backgroundColor: TOKENS.bg,
          fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        } as CSSProperties
      }
    >
      <GrainOverlay />

      {/* Ambient blooms */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -left-[20%] top-[8%] h-[55vh] w-[70vw] rounded-full opacity-[0.08]"
          style={{ background: `radial-gradient(circle, ${TOKENS.teal} 0%, transparent 70%)` }}
        />
        <div
          className="absolute -right-[15%] bottom-[5%] h-[50vh] w-[65vw] rounded-full opacity-[0.08]"
          style={{ background: `radial-gradient(circle, ${TOKENS.amber} 0%, transparent 70%)` }}
        />
      </div>

      {/* §1 Nav */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`sticky top-0 z-50 flex h-16 w-full items-center justify-between px-5 transition-all duration-300 md:px-8 ${
          scrolled ? "border-b border-white/[0.06] bg-black/40 backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <Link to="/welcome" className="flex min-h-12 items-center gap-2.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: TOKENS.teal }} />
          <span
            className="text-lg tracking-tight text-white md:text-xl"
            style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
          >
            Eso Energy
          </span>
        </Link>
        <LandingAuthActions variant="marketing" />
      </motion.header>

      <main className="relative z-10 mx-auto w-full max-w-[1440px]">
        {/* §2 Hero */}
        <section className="relative flex min-h-[88vh] flex-col justify-center px-5 pb-16 pt-8 md:px-8 lg:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              background: `
                radial-gradient(ellipse 60% 50% at 8% 18%, ${TOKENS.teal}, transparent 70%),
                radial-gradient(ellipse 50% 45% at 92% 82%, ${TOKENS.amber}, transparent 70%)
              `,
            }}
          />

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
            className="relative max-w-3xl"
          >
            <motion.div variants={fadeUp} className="mb-8 inline-flex">
              <span
                className="inline-flex min-h-12 items-center gap-2.5 rounded-full border px-4 py-2 text-sm"
                style={{
                  borderColor: `${TOKENS.teal}44`,
                  boxShadow: `0 0 24px ${TOKENS.teal}22`,
                  color: TOKENS.teal,
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ backgroundColor: TOKENS.teal }}
                  />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: TOKENS.teal }} />
                </span>
                The sovereign infrastructure
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="mb-6 leading-[0.92]">
              <span
                className="block italic text-white"
                style={{
                  fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
                  fontSize: "clamp(3.5rem, 12vw, 6rem)",
                }}
              >
                Eso
              </span>
              <span
                className="block"
                style={{
                  fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
                  fontSize: "clamp(3.5rem, 12vw, 6rem)",
                  color: TOKENS.teal,
                }}
              >
                Energy
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mb-10 max-w-xl text-lg leading-relaxed md:text-[18px]"
              style={{ color: TOKENS.muted }}
            >
              Orchestrate solar, grid, and fuel assets in one place — built for African enterprises that
              can&apos;t afford downtime.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col items-start gap-4">
              <Link
                to="/access"
                className="inline-flex min-h-14 w-full max-w-md items-center justify-center rounded-full px-8 text-base font-semibold text-[#080C0C] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
                style={{
                  backgroundColor: TOKENS.teal,
                  boxShadow: `0 0 40px ${TOKENS.teal}33`,
                }}
              >
                Open command center
              </Link>
              <button
                type="button"
                onClick={scrollToStats}
                className="flex min-h-12 items-center gap-1 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: TOKENS.teal }}
              >
                Explore the platform
                <motion.span
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  ↓
                </motion.span>
              </button>
            </motion.div>

            <motion.p
              variants={fadeUp}
              className="mt-10 inline-flex rounded-full border px-4 py-2.5 text-sm"
              style={{ borderColor: TOKENS.glassBorder, color: TOKENS.muted }}
            >
              Trusted by 40+ enterprise teams across Africa
            </motion.p>
          </motion.div>
        </section>

        {/* §3 Logo strip */}
        <section className="border-y px-0 py-10" style={{ borderColor: `${TOKENS.teal}0a` }}>
          <div className="mb-6 h-px w-full" style={{ backgroundColor: `${TOKENS.teal}0a` }} />
          <p
            className="mb-8 text-center text-[11px] font-medium uppercase tracking-[0.2em]"
            style={{ color: TOKENS.muted }}
          >
            Used by teams at
          </p>
          <div className="relative overflow-hidden">
            <div className="flex w-max animate-[ticker_32s_linear_infinite] gap-6 px-5">
              {[...LOGOS, ...LOGOS].map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-medium"
                  style={{ borderColor: TOKENS.glassBorder, backgroundColor: TOKENS.glass, color: TOKENS.muted }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 h-px w-full" style={{ backgroundColor: `${TOKENS.teal}0a` }} />
          <style>{`
            @keyframes ticker {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </section>

        {/* §4 Platform stats */}
        <motion.section
          id="platform-stats"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          className="px-5 py-20 md:px-8 lg:px-12"
        >
          <motion.p
            variants={fadeUp}
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: TOKENS.teal }}
          >
            Platform
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mb-4 max-w-2xl text-[clamp(2rem,5vw,2.625rem)] leading-tight tracking-tight text-white"
            style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
          >
            Infrastructure you can measure
          </motion.h2>
          <motion.p variants={fadeUp} className="mb-12 max-w-lg text-base" style={{ color: TOKENS.muted }}>
            Live telemetry and ledger data from day one.
          </motion.p>

          <div className="flex flex-col gap-3 md:flex-row md:gap-4">
            {STATS.map((stat) => (
              <motion.article
                key={stat.label}
                variants={fadeUp}
                className="relative flex flex-1 items-center justify-between overflow-hidden rounded-2xl border p-6 backdrop-blur-md"
                style={{
                  backgroundColor: TOKENS.glass,
                  borderColor: TOKENS.glassBorder,
                  borderLeftWidth: 3,
                  borderLeftColor: stat.accent,
                }}
              >
                <span
                  className="pointer-events-none absolute right-4 top-2 select-none text-5xl font-bold opacity-[0.06]"
                  aria-hidden
                >
                  {stat.ghost}
                </span>
                <div>
                  <CountUpStat
                    target={stat.value}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                    className="block text-4xl font-semibold tracking-tight md:text-5xl"
                    style={{ color: stat.accent }}
                  />
                  <p className="mt-2 text-sm font-medium" style={{ color: TOKENS.muted }}>
                    {stat.label}
                  </p>
                </div>
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${stat.accent}18` }}
                >
                  <stat.Icon size={26} color={stat.accent} strokeWidth={1.75} />
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>

        {/* §5 How it works */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          className="px-5 py-20 md:px-8 lg:px-12"
        >
          <motion.h2
            variants={fadeUp}
            className="mb-4 max-w-2xl text-[clamp(2.25rem,5vw,3rem)] leading-tight tracking-tight text-white"
            style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
          >
            Set up in days, not months
          </motion.h2>
          <motion.p variants={fadeUp} className="mb-12 max-w-xl text-base" style={{ color: TOKENS.muted }}>
            Connect assets, let Eso orchestrate, and see savings on your next bill cycle.
          </motion.p>

          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {STEPS.map((step) => (
              <motion.article
                key={step.n}
                variants={fadeUp}
                className="relative overflow-hidden rounded-2xl border p-6 backdrop-blur-md md:p-8"
                style={{ backgroundColor: TOKENS.glass, borderColor: TOKENS.glassBorder }}
              >
                <span
                  className="pointer-events-none absolute -right-1 -top-3 select-none text-[5.5rem] leading-none opacity-[0.06]"
                  style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', color: "#fff" }}
                  aria-hidden
                >
                  {step.n}
                </span>
                <h3
                  className="relative mb-3 text-xl font-medium text-white md:text-2xl"
                  style={{ fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
                >
                  {step.title}
                </h3>
                <p className="relative text-base leading-relaxed" style={{ color: TOKENS.muted }}>
                  {step.body}
                </p>
              </motion.article>
            ))}
          </div>
        </motion.section>

        {/* §6 Final CTA */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          className="relative mx-5 mb-20 overflow-hidden rounded-3xl border px-6 py-20 text-center md:mx-8 md:px-12 lg:mx-12"
          style={{ borderColor: TOKENS.glassBorder, backgroundColor: "rgba(255,255,255,0.03)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(ellipse 70% 60% at 50% 50%, ${TOKENS.teal}33, transparent 70%)`,
            }}
          />
          <h2
            className="relative mb-4 italic leading-tight text-white"
            style={{
              fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
              fontSize: "clamp(2rem, 6vw, 3.25rem)",
            }}
          >
            The grid doesn&apos;t wait.
          </h2>
          <p className="relative mb-8 text-lg" style={{ color: TOKENS.muted }}>
            Neither should your infrastructure.
          </p>
          <Link
            to="/access"
            className="relative inline-flex min-h-12 items-center justify-center rounded-full px-8 text-base font-semibold text-[#080C0C] transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: TOKENS.teal }}
          >
            Choose your command center
          </Link>
        </motion.section>
      </main>
    </div>
  );
}
