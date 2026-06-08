import { WEB_APP_READINESS } from "@/lib/webReadiness";

const TEAL = "#00F5D4";
const GOLD = "#F5CB5C";

function ReadinessBar({ percent }: { percent: number }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${percent}% complete`}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${percent}%`,
          background: `linear-gradient(90deg, ${TEAL}, ${GOLD})`,
          boxShadow: `0 0 12px ${TEAL}55`,
        }}
      />
    </div>
  );
}

export function WebReadinessPanel() {
  const { overallPercent, status, summary, categories } = WEB_APP_READINESS;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#F5CB5C]/25 bg-gradient-to-br from-[#0f1218] via-[#0a0d12] to-[#11151c] p-5 shadow-[0_0_0_1px_rgba(245,203,92,0.08),0_0_32px_rgba(245,203,92,0.06)]"
      aria-labelledby="readiness-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[#F5CB5C]/80">
            Platform readiness
          </p>
          <h2
            id="readiness-heading"
            className="mt-2 font-sans text-lg font-semibold tracking-tight text-white"
          >
            Web command deck
          </h2>
        </div>
        <div className="text-right">
          <p
            className="font-mono text-3xl font-black leading-none tracking-tighter"
            style={{ color: GOLD }}
          >
            {overallPercent}%
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-emerald-500/90">
            {status}
          </p>
        </div>
      </div>

      <ReadinessBar percent={overallPercent} />

      <p className="mt-4 text-[13px] leading-relaxed text-zinc-400">{summary}</p>

      <ul className="mt-5 space-y-3">
        {categories.map((item) => (
          <li key={item.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                {item.label}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-[#00F5D4]">{item.percent}%</span>
            </div>
            <ReadinessBar percent={item.percent} />
            <p className="mt-1 font-mono text-[9px] text-zinc-600">{item.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
