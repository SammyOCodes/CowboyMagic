import type { Currency } from "./markets";

const fmt = (currency: Currency, digits: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const cache = new Map<string, Intl.NumberFormat>();
function formatter(currency: Currency, digits: number): Intl.NumberFormat {
  const key = `${currency}:${digits}`;
  let f = cache.get(key);
  if (!f) cache.set(key, (f = fmt(currency, digits)));
  return f;
}

/** Currency amount with cents, e.g. "$1,760.07" or "€33,768.47". */
export function formatMoney(n: number | null | undefined, currency: Currency = "USD"): string {
  if (n === null || n === undefined) return "—";
  return formatter(currency, 2).format(n);
}

/** Whole units for large aggregates (set totals). */
export function formatMoneyWhole(n: number | null | undefined, currency: Currency = "USD"): string {
  if (n === null || n === undefined) return "—";
  return formatter(currency, 0).format(n);
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const rounded = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
