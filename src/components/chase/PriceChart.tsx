"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import clsx from "clsx";
import { formatMoney, formatShortDate } from "@/lib/chase/format";
import { currencySymbol, type Currency } from "@/lib/chase/markets";

export interface ChartSeries {
  key: string;
  label: string;
  /** Hex color; slots come from the validated palette in globals.css. */
  color: string;
}

export type ChartRow = { date: string } & Record<string, string | number | null>;

interface PriceChartProps {
  data: ChartRow[];
  series: ChartSeries[];
  height?: number;
  /** Shown above the chart and used as its accessible name. */
  title: string;
  currency?: Currency;
}

const RANGES: { label: string; days: number | null }[] = [
  { label: "30D", days: 30 },
  { label: "60D", days: 60 },
  { label: "90D", days: 90 },
  { label: "All", days: null },
];

const INK = "#f5e6c8";
const INK_SECONDARY = "#8a7560";
const GRID = "#3d2a1a";

function cutoff(last: string, days: number): string {
  const d = new Date(`${last}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  currency,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number | string | null }[];
  label?: string;
  series: ChartSeries[];
  currency: Currency;
}) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-lg border border-border-light bg-bg-primary/95 px-3 py-2 shadow-lg">
      <div className="text-xs text-text-secondary mb-1">{formatShortDate(label)}</div>
      <ul className="space-y-1">
        {series.map((s) => {
          const entry = payload.find((p) => p.dataKey === s.key);
          const value = typeof entry?.value === "number" ? entry.value : null;
          return (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className="inline-block w-3 h-0.5 rounded"
                style={{ backgroundColor: s.color }}
              />
              <span className="font-semibold text-text-primary tabular-nums">
                {formatMoney(value, currency)}
              </span>
              <span className="text-xs text-text-secondary">{s.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function PriceChart({
  data,
  series,
  height = 320,
  title,
  currency = "USD",
}: PriceChartProps) {
  const symbol = currencySymbol(currency);
  const [range, setRange] = useState<number | null>(90);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [asTable, setAsTable] = useState(false);

  // Only offer series that actually have data.
  const available = useMemo(
    () => series.filter((s) => data.some((r) => typeof r[s.key] === "number")),
    [series, data]
  );
  const visible = available.filter((s) => !hidden.has(s.key));

  const rows = useMemo(() => {
    if (data.length === 0 || range === null) return data;
    const from = cutoff(data[data.length - 1].date, range);
    return data.filter((r) => r.date >= from);
  }, [data, range]);

  if (data.length < 2 || available.length === 0) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-6 text-sm text-text-secondary">
        {data.length === 0 ? "No price recorded yet." : "Only one day of price data so far."} Run{" "}
        <code className="text-accent-gold">npm run sync</code> daily to build history, or{" "}
        <code className="text-accent-gold">npm run sync:history</code> to backfill about 90 days.
      </div>
    );
  }

  const spanDays = Math.round(
    (new Date(data[data.length - 1].date).getTime() - new Date(data[0].date).getTime()) /
      86_400_000
  );

  return (
    <figure className="bg-bg-secondary border border-border rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <figcaption className="text-sm font-semibold text-text-primary">{title}</figcaption>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRange(r.days)}
                aria-pressed={range === r.days}
                className={clsx(
                  "px-2.5 py-1 text-xs transition-colors",
                  range === r.days
                    ? "bg-bg-surface text-accent-gold"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAsTable((t) => !t)}
            aria-pressed={asTable}
            className="px-2.5 py-1 text-xs rounded-lg border border-border text-text-secondary hover:text-text-primary"
          >
            {asTable ? "Chart" : "Table"}
          </button>
        </div>
      </div>

      {available.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-2" aria-label="Series">
          {available.map((s) => {
            const off = hidden.has(s.key);
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() =>
                    setHidden((h) => {
                      const next = new Set(h);
                      if (next.has(s.key)) next.delete(s.key);
                      else if (available.length - next.size > 1) next.add(s.key);
                      return next;
                    })
                  }
                  aria-pressed={!off}
                  className={clsx(
                    "flex items-center gap-2 text-xs transition-opacity",
                    off ? "opacity-40" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <span
                    aria-hidden
                    className="inline-block w-4 h-0.5 rounded"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {asTable ? (
        <div className="max-h-80 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg-secondary">
              <tr className="text-left text-xs text-text-muted">
                <th className="px-3 py-2 font-medium">Date</th>
                {available.map((s) => (
                  <th key={s.key} className="px-3 py-2 font-medium text-right">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.date} className="border-t border-border/60">
                  <td className="px-3 py-1.5 text-text-secondary">{r.date}</td>
                  {available.map((s) => (
                    <td key={s.key} className="px-3 py-1.5 text-right tabular-nums">
                      {typeof r[s.key] === "number" ? formatMoney(r[s.key] as number, currency) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height }} role="img" aria-label={`${title}: line chart over ${rows.length} days`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID} strokeOpacity={0.6} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                stroke={GRID}
                tick={{ fill: INK_SECONDARY, fontSize: 12 }}
                tickLine={false}
                minTickGap={48}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 1000
                    ? `${symbol}${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`
                    : `${symbol}${Math.round(v)}`
                }
                stroke={GRID}
                tick={{ fill: INK_SECONDARY, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={52}
                domain={["auto", "auto"]}
              />
              <Tooltip
                cursor={{ stroke: INK, strokeOpacity: 0.35, strokeWidth: 1 }}
                content={<ChartTooltip series={visible} currency={currency} />}
              />
              {visible.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={rows.length <= 2 ? { r: 4, fill: s.color, stroke: "#1a0f0a", strokeWidth: 2 } : false}
                  activeDot={{ r: 5, fill: s.color, stroke: "#1a0f0a", strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-2 text-xs text-text-muted">
        {data.length} data points over {spanDays} days.
        {spanDays < 7 && " History is brand new; it grows with every sync."}
      </p>
    </figure>
  );
}
