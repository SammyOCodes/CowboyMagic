import type { SparkPoint } from "@/lib/chase/queries";

interface SparklineProps {
  points: SparkPoint[] | undefined;
  width?: number;
  height?: number;
  label?: string;
}

/** Tiny dependency-free trend line; x is scaled by date so gaps read honestly. */
export default function Sparkline({ points, width = 96, height = 28, label }: SparklineProps) {
  if (!points || points.length < 2) {
    return (
      <svg width={width} height={height} role="img" aria-label="Not enough history yet">
        <line
          x1={2}
          x2={width - 2}
          y1={height / 2}
          y2={height / 2}
          stroke="var(--text-muted)"
          strokeWidth={1.5}
          strokeDasharray="3 4"
        />
      </svg>
    );
  }

  const t0 = new Date(points[0][0]).getTime();
  const t1 = new Date(points[points.length - 1][0]).getTime();
  const span = Math.max(1, t1 - t0);
  const prices = points.map((p) => p[1]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 3;
  const x = (d: string) => pad + ((new Date(d).getTime() - t0) / span) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);
  const d = points.map(([date, v], i) => `${i ? "L" : "M"}${x(date).toFixed(1)},${y(v).toFixed(1)}`);
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={label ?? `Price trend over ${points.length} data points`}
    >
      <path
        d={d.join(" ")}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(last[0])}
        cy={y(last[1])}
        r={3}
        fill="var(--series-1)"
        stroke="var(--bg-secondary)"
        strokeWidth={2}
      />
    </svg>
  );
}
