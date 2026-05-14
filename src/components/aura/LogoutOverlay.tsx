import { AnimatePresence, motion } from "framer-motion";
import { useLogoutActive } from "@/lib/logout-bus";

export function LogoutOverlay() {
  const active = useLogoutActive();
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="logout-overlay"
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
          className="fixed inset-0 z-[200] grid place-items-center backdrop-blur-xl bg-neutral-950/80"
          aria-live="assertive"
          role="status"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center px-6"
          >
            <div className="mx-auto mb-5 h-px w-24 bg-gradient-to-r from-transparent via-[oklch(0.78_0.13_86)] to-transparent" />
            <p className="text-[11px] md:text-[12px] font-mono tracking-[0.42em] uppercase text-silver/90">
              Terminating Encrypted Telemetry Stream<motion.span
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >...</motion.span>
            </p>
            <p className="mt-3 text-[10px] md:text-[11px] font-mono tracking-[0.38em] uppercase text-[var(--gold)]">
              Session Secured
            </p>
            <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[oklch(0.78_0.13_86)] to-transparent" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
