import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPct } from "@/lib/chase/format";

interface ChangeBadgeProps {
  value: number | null | undefined;
  label?: string;
}

/** Percent change with direction icon + sign, so color is never the only cue. */
export default function ChangeBadge({ value, label }: ChangeBadgeProps) {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
        {label && <span>{label}</span>}
        <span>—</span>
      </span>
    );
  }
  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const color = flat
    ? "text-text-secondary"
    : up
      ? "text-[var(--status-good)]"
      : "text-[var(--status-critical)]";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      {label && <span className="text-text-muted font-normal mr-0.5">{label}</span>}
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {formatPct(value)}
    </span>
  );
}
