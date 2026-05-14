import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "text-[12px]",
  md: "text-[15px]",
  lg: "text-[20px] md:text-[22px]",
};

export function EsoLogo({
  size = "md",
  showDot = true,
  className,
}: {
  size?: Size;
  showDot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "eso-logo group inline-flex items-center font-sans whitespace-nowrap select-none",
        SIZE[size],
        className,
      )}
      aria-label="EsoEnergy"
    >
      <span className="eso-logo-text relative inline-flex items-center tracking-[0.3em]">
        <span className="font-bold text-white">E S O</span>
        <span aria-hidden className="inline-block w-[0.6em]" />
        <span className="font-light text-neutral-400">E N E R G Y</span>
      </span>
      {showDot && (
        <span
          aria-hidden
          className="ml-2 inline-block align-middle h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
          style={{ boxShadow: "0 0 10px #10B981" }}
          title="Live telemetry"
        />
      )}
    </span>
  );
}
