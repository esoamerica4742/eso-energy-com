import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, ArrowRight, Activity, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

/* ============== Ambient particles ============== */
function Particles() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  // deterministic seeds
  const dots = Array.from({ length: 18 }).map((_, i) => ({
    id: i,
    x: (i * 53) % 100,
    y: (i * 31) % 100,
    d: 6 + ((i * 7) % 10),
    delay: (i % 7) * 0.4,
    size: 1 + (i % 3),
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((d) => (
        <motion.span
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
            background:
              "radial-gradient(circle, oklch(0.92 0.05 280 / 0.9), oklch(0.62 0.20 282 / 0))",
            filter: "blur(0.4px)",
          }}
          animate={{
            y: [0, -28, 0],
            opacity: [0, 0.9, 0],
          }}
          transition={{
            duration: d.d,
            delay: d.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ============== Animated Gradient Wash ============== */
function GradientWash() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduce ? 0 : 0.9 }}
      style={{
        background:
          "radial-gradient(700px 420px at 50% 30%, oklch(0.62 0.20 282 / 0.28), transparent 60%), radial-gradient(600px 360px at 50% 90%, oklch(0.74 0.17 165 / 0.18), transparent 65%)",
      }}
    >
      {!reduce && (
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(900px 500px at 30% 70%, oklch(0.68 0.18 282 / 0.18), transparent 60%)",
          }}
        />
      )}
    </motion.div>
  );
}

/* ============== Signup Success Card ============== */
export function SignupSuccessCard({
  onReturn,
  onTrack,
}: {
  onReturn: () => void;
  onTrack?: () => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key="signup-success"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, filter: "blur(14px)", scale: 0.96 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16, filter: "blur(10px)", scale: 0.98 }}
      transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 130, damping: 18 }}
      className="absolute inset-0 z-30 flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <GradientWash />
      <Particles />

      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={reduce ? undefined : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-full max-w-md mx-auto px-6"
      >
        <div
          className="relative overflow-hidden p-8 md:p-10 text-center"
          style={{
            borderRadius: 28,
            background:
              "linear-gradient(160deg, oklch(0.18 0.02 265 / 0.78), oklch(0.12 0.015 265 / 0.78))",
            border: "1px solid oklch(1 0 0 / 0.08)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            boxShadow:
              "0 40px 90px -20px oklch(0 0 0 / 0.7), 0 0 0 1px oklch(0.62 0.20 282 / 0.18), 0 0 60px oklch(0.62 0.20 282 / 0.18), inset 0 1px 0 oklch(1 0 0 / 0.08)",
          }}
        >
          {/* soft border-glow ring */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[28px]"
            style={{
              boxShadow:
                "inset 0 0 60px oklch(0.62 0.20 282 / 0.15), inset 0 0 1px oklch(1 0 0 / 0.18)",
            }}
          />

          {/* glowing success indicator */}
          <div className="relative mx-auto h-20 w-20 mb-6">
            {/* outer halo */}
            <motion.span
              className="absolute inset-0 rounded-full"
              animate={reduce ? { opacity: 0.35 } : { scale: [1, 1.18, 1], opacity: [0.45, 0.15, 0.45] }}
              transition={reduce ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background:
                  "radial-gradient(circle, oklch(0.74 0.17 165 / 0.55), transparent 65%)",
                filter: "blur(8px)",
              }}
            />
            {/* expanding ring */}
            {!reduce && (
              <motion.span
                className="absolute inset-0 rounded-full"
                initial={{ scale: 0.6, opacity: 0.7 }}
                animate={{ scale: [0.7, 1.4], opacity: [0.7, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                style={{ border: "1px solid oklch(0.74 0.17 165 / 0.6)" }}
              />
            )}
            {/* core disc */}
            <motion.div
              initial={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
              animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
              className="absolute inset-2 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.74 0.17 165), oklch(0.62 0.18 175))",
                boxShadow:
                  "0 14px 30px -10px oklch(0.74 0.17 165 / 0.7), inset 0 1px 0 oklch(1 0 0 / 0.4)",
              }}
            >
              <Check className="h-9 w-9 text-[oklch(0.10_0.02_165)]" strokeWidth={3} />
            </motion.div>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-[22px] md:text-2xl font-semibold tracking-tight text-foreground"
          >
            Access Request Submitted
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-3 text-[13px] leading-relaxed text-silver/85 max-w-sm mx-auto"
          >
            Your organization workspace is being prepared.
            <br />
            You’ll receive onboarding instructions shortly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-7 flex flex-col items-center gap-3"
          >
            <button
              type="button"
              onClick={onReturn}
              className="group relative w-full overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[12px] font-semibold tracking-[0.22em] uppercase cursor-pointer transition-[letter-spacing,box-shadow] duration-300 hover:tracking-[0.30em]"
              style={{
                color: "oklch(0.10 0.02 265)",
                background:
                  "linear-gradient(135deg, oklch(0.78 0.13 86), oklch(0.89 0.07 88))",
                boxShadow:
                  "inset 0 1px 0 oklch(1 0 0 / 0.4), 0 18px 40px -12px oklch(0.78 0.13 86 / 0.45)",
              }}
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                Return to Command Deck
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 30%, oklch(1 0 0 / 0.45) 50%, transparent 70%)",
                  backgroundSize: "220% 100%",
                  animation: "lux-shimmer 2.6s linear infinite",
                  mixBlendMode: "overlay",
                }}
              />
            </button>

            <button
              type="button"
              onClick={onTrack ?? onReturn}
              className="inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.28em] uppercase text-silver/70 hover:text-[var(--gold)] transition-colors cursor-pointer"
            >
              <Activity className="h-3 w-3" />
              Track Request Status
            </button>
          </motion.div>

          <div className="mt-7 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[9.5px] tracking-[0.28em] uppercase text-silver/55">
            <ShieldCheck className="h-3 w-3" />
            Encrypted handshake · ref #
            {Math.random().toString(36).slice(2, 8).toUpperCase()}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============== Login Authenticating Overlay ============== */
const STATUS_LINES = [
  "Authenticating Access",
  "Verifying Encryption Keys",
  "Synchronising Telemetry Mesh",
  "Command Deck Ready",
];

export function AuthenticatingOverlay() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STATUS_LINES.length - 1)), 520);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      key="authenticating"
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{
        background:
          "radial-gradient(900px 500px at 50% 50%, oklch(0.10 0.02 265 / 0.85), oklch(0.05 0.005 265 / 0.95))",
        backdropFilter: "blur(24px) saturate(140%)",
        WebkitBackdropFilter: "blur(24px) saturate(140%)",
      }}
    >
      <Particles />

      {/* ambient pulse */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(500px 320px at 50% 50%, oklch(0.62 0.20 282 / 0.30), transparent 65%)",
        }}
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
        className="relative px-8 py-10 text-center max-w-sm w-full mx-5"
        style={{
          borderRadius: 28,
          background:
            "linear-gradient(160deg, oklch(0.18 0.02 265 / 0.55), oklch(0.10 0.015 265 / 0.55))",
          border: "1px solid oklch(1 0 0 / 0.08)",
          backdropFilter: "blur(28px) saturate(180%)",
          boxShadow:
            "0 40px 90px -20px oklch(0 0 0 / 0.8), inset 0 1px 0 oklch(1 0 0 / 0.08)",
        }}
      >
        {/* concentric pulsing rings */}
        <div className="relative mx-auto h-24 w-24 mb-7">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full"
              animate={{ scale: [0.5, 1.2], opacity: [0.7, 0] }}
              transition={{
                duration: 2.2,
                delay: i * 0.55,
                repeat: Infinity,
                ease: "easeOut",
              }}
              style={{ border: "1px solid oklch(0.62 0.20 282 / 0.55)" }}
            />
          ))}
          <motion.div
            className="absolute inset-5 rounded-full"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "radial-gradient(circle, oklch(0.78 0.13 86 / 0.95), oklch(0.62 0.20 282 / 0.4))",
              boxShadow:
                "0 0 40px oklch(0.62 0.20 282 / 0.7), inset 0 1px 0 oklch(1 0 0 / 0.4)",
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.35 }}
            className="text-[12px] tracking-[0.32em] uppercase text-foreground font-medium"
          >
            {STATUS_LINES[step]}
          </motion.div>
        </AnimatePresence>

        {/* futuristic progress bar */}
        <div className="relative mt-6 mx-auto h-[2px] w-56 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="absolute inset-y-0 left-0 w-1/3 rounded-full"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.78 0.13 86 / 0.95), transparent)",
              boxShadow: "0 0 16px oklch(0.78 0.13 86 / 0.8)",
            }}
          />
        </div>

        <p className="mt-5 text-[9.5px] tracking-[0.28em] uppercase text-silver/55">
          Secure Channel · AES-256-GCM
        </p>
      </motion.div>
    </motion.div>
  );
}

export function AuthOverlayWrapper({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return <AnimatePresence mode="wait">{show ? children : null}</AnimatePresence>;
}
