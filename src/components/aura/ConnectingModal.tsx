import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

const LOG_LINES = [
  "📡 Locating remote inverter data gateway...",
  "🔑 Handshaking with data logger cloud API...",
  "🛡️ Establishing encrypted Supabase stream handshake...",
  "📊 Reading live battery bank health and thermal arrays...",
] as const;

const LOG_INTERVAL_MS = 1000; // 4 lines × 1s = 4s sequence

export function ConnectingModal({
  open,
  onComplete,
}: {
  open: boolean;
  onComplete: () => void;
}) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [stage, setStage] = useState<"scanning" | "success">("scanning");

  useEffect(() => {
    if (!open) {
      setVisibleLines(0);
      setStage("scanning");
      return;
    }

    setVisibleLines(0);
    setStage("scanning");

    const timers: ReturnType<typeof setTimeout>[] = [];
    LOG_LINES.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleLines(i + 1);
        }, i * LOG_INTERVAL_MS),
      );
    });

    // After all lines (4s), transition to success
    timers.push(
      setTimeout(() => {
        setStage("success");
      }, LOG_LINES.length * LOG_INTERVAL_MS),
    );

    // Auto-redirect 1.6s after the success state appears
    timers.push(
      setTimeout(
        () => onComplete(),
        LOG_LINES.length * LOG_INTERVAL_MS + 1600,
      ),
    );

    return () => timers.forEach(clearTimeout);
  }, [open, onComplete]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="connecting-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{
            background:
              "radial-gradient(80% 60% at 50% 40%, oklch(0.20 0.04 165 / 0.35), transparent 60%), oklch(0.10 0.005 265 / 0.92)",
            backdropFilter: "blur(28px) saturate(160%)",
            WebkitBackdropFilter: "blur(28px) saturate(160%)",
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

          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg rounded-3xl p-8 md:p-10"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.18 0.02 265 / 0.7), oklch(0.13 0.015 265 / 0.7))",
              boxShadow:
                "inset 0 1px 0 oklch(1 0 0 / 0.08), 0 24px 80px oklch(0 0 0 / 0.7)",
              border: "1px solid oklch(1 0 0 / 0.07)",
            }}
          >
            {/* Radar / Success area */}
            <div className="relative mx-auto h-44 w-44 md:h-52 md:w-52">
              <AnimatePresence mode="wait">
                {stage === "scanning" ? (
                  <motion.div
                    key="radar"
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.35 }}
                  >
                    <Radar />
                  </motion.div>
                ) : (
                  <motion.div
                    key="check"
                    className="absolute inset-0 grid place-items-center"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <SuccessCheck />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Header */}
            <div className="mt-6 text-center">
              <p className="text-[10px] tracking-[0.32em] uppercase text-silver/80">
                EsoEnergy Mesh · Remote Handshake
              </p>
              <AnimatePresence mode="wait">
                {stage === "scanning" ? (
                  <motion.h2
                    key="title-scan"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="mt-2 text-2xl md:text-[26px] font-semibold tracking-tight"
                  >
                    <span className="shimmer-text">Connecting…</span>
                  </motion.h2>
                ) : (
                  <motion.h2
                    key="title-done"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-2 text-2xl md:text-[26px] font-semibold tracking-tight"
                    style={{ color: "oklch(0.92 0.14 165)" }}
                  >
                    Connection Successful
                  </motion.h2>
                )}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {stage === "success" && (
                  <motion.p
                    key="subtitle-done"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mt-1 text-sm text-silver"
                  >
                    Welcome to EsoEnergy Fleet Command.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Terminal log */}
            <div
              className="mt-6 rounded-2xl p-4 font-mono text-[12px] leading-relaxed min-h-[160px]"
              style={{
                background: "oklch(0.10 0.005 265 / 0.7)",
                border: "1px solid oklch(1 0 0 / 0.05)",
              }}
            >
              {LOG_LINES.map((line, i) => {
                const isVisible = i < visibleLines;
                const isLatest = i === visibleLines - 1 && stage === "scanning";
                const isDone = stage === "success" || i < visibleLines - 1;
                return (
                  <motion.div
                    key={line}
                    initial={{ opacity: 0, x: -8 }}
                    animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-start gap-2 py-0.5"
                    style={{
                      color: isDone
                        ? "oklch(0.88 0.16 165)"
                        : isLatest
                          ? "oklch(0.95 0.02 250)"
                          : "oklch(0.74 0.025 255)",
                    }}
                  >
                    <span className="select-none" style={{ color: "oklch(0.74 0.025 255 / 0.6)" }}>
                      {isDone ? "✓" : isLatest ? "›" : " "}
                    </span>
                    <span className="flex-1">
                      {line}
                      {isLatest && (
                        <span className="ml-1 inline-block h-3 w-1 align-middle animate-pulse"
                          style={{ background: "oklch(0.88 0.16 165)" }} />
                      )}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            <p className="mt-5 text-center text-[10px] tracking-[0.32em] uppercase text-silver/60">
              AES-256 · End-to-end encrypted
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Radar() {
  const RING_COUNT = 3;
  return (
    <div className="relative h-full w-full">
      {/* Concentric static rings */}
      {[0.4, 0.65, 0.9].map((scale, i) => (
        <div
          key={i}
          className="absolute inset-0 m-auto rounded-full"
          style={{
            width: `${scale * 100}%`,
            height: `${scale * 100}%`,
            border: "1px solid oklch(0.78 0.17 165 / 0.18)",
            boxShadow: "inset 0 0 24px oklch(0.78 0.17 165 / 0.06)",
          }}
        />
      ))}

      {/* Pulsing rings */}
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <motion.div
          key={`pulse-${i}`}
          className="absolute inset-0 m-auto rounded-full"
          style={{
            border: "1px solid oklch(0.78 0.17 165 / 0.55)",
            boxShadow: "0 0 24px oklch(0.78 0.17 165 / 0.4)",
          }}
          initial={{ width: "20%", height: "20%", opacity: 0.9 }}
          animate={{ width: "100%", height: "100%", opacity: 0 }}
          transition={{
            duration: 2.4,
            ease: "easeOut",
            repeat: Infinity,
            delay: i * 0.8,
          }}
        />
      ))}

      {/* Sweep arm */}
      <motion.div
        className="absolute inset-0 m-auto rounded-full"
        style={{
          width: "90%",
          height: "90%",
          background:
            "conic-gradient(from 0deg, oklch(0.78 0.17 165 / 0.5), oklch(0.78 0.17 165 / 0) 30%, transparent 60%)",
          maskImage: "radial-gradient(circle, black 60%, transparent 62%)",
          WebkitMaskImage: "radial-gradient(circle, black 60%, transparent 62%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, ease: "linear", repeat: Infinity }}
      />

      {/* Core dot */}
      <div
        className="absolute inset-0 m-auto h-3 w-3 rounded-full"
        style={{
          background: "oklch(0.92 0.16 165)",
          boxShadow: "0 0 16px oklch(0.78 0.17 165 / 0.9), 0 0 32px oklch(0.78 0.17 165 / 0.5)",
        }}
      />

      {/* Crosshair */}
      <div className="absolute inset-0 m-auto h-px w-full" style={{ background: "oklch(0.78 0.17 165 / 0.12)" }} />
      <div className="absolute inset-0 m-auto w-px h-full" style={{ background: "oklch(0.78 0.17 165 / 0.12)" }} />
    </div>
  );
}

function SuccessCheck() {
  return (
    <div
      className="relative grid h-32 w-32 place-items-center rounded-full"
      style={{
        background:
          "radial-gradient(circle at 30% 25%, oklch(0.40 0.10 165 / 0.6), oklch(0.18 0.04 165 / 0.7))",
        boxShadow:
          "inset 0 0 0 1px oklch(0.78 0.17 165 / 0.55), 0 0 50px oklch(0.78 0.17 165 / 0.55), 0 0 120px oklch(0.78 0.17 165 / 0.25)",
      }}
    >
      {/* Outer ring */}
      <motion.svg
        viewBox="0 0 100 100"
        className="absolute inset-0"
        initial={{ rotate: -90 }}
        animate={{ rotate: 270 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="oklch(0.88 0.16 165)"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: "drop-shadow(0 0 6px oklch(0.78 0.17 165 / 0.7))" }}
        />
      </motion.svg>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <Check
          className="h-14 w-14"
          strokeWidth={1.6}
          style={{
            color: "oklch(0.96 0.12 165)",
            filter: "drop-shadow(0 0 10px oklch(0.78 0.17 165 / 0.7))",
          }}
        />
      </motion.div>
    </div>
  );
}
