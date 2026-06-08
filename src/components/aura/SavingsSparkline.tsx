/**
 * 7-day savings trend — minimal SVG sparkline (no gradient fill, Stripe-style).
 */
type Point = { day: string; savings: number };

const DEFAULT_DATA: Point[] = [
  { day: "Mon", savings: 380000 },
  { day: "Tue", savings: 395000 },
  { day: "Wed", savings: 410000 },
  { day: "Thu", savings: 388000 },
  { day: "Fri", savings: 420000 },
  { day: "Sat", savings: 405000 },
  { day: "Sun", savings: 412750 },
];

export function SavingsSparkline({ data = DEFAULT_DATA }: { data?: Point[] }) {
  const w = 280;
  const h = 48;
  const max = Math.max(...data.map((d) => d.savings), 1);
  const min = Math.min(...data.map((d) => d.savings));
  const range = max - min || 1;
  const pts = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d.savings - min) / range) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12 mt-3" aria-hidden>
      <polyline
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}
