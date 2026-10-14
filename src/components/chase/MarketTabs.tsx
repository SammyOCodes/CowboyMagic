import Link from "next/link";
import clsx from "clsx";
import { MARKETS, currencySymbol, type Market } from "@/lib/chase/markets";

interface MarketTabsProps {
  current: Market;
  hrefFor: (market: Market) => string;
}

/** Server-rendered segmented control; each option is a plain link, so it works without JS. */
export default function MarketTabs({ current, hrefFor }: MarketTabsProps) {
  return (
    <div
      role="group"
      aria-label="Price market"
      className="inline-flex rounded-lg border border-border overflow-hidden bg-bg-secondary"
    >
      {MARKETS.map((m) => {
        const active = m.key === current;
        return (
          <Link
            key={m.key}
            href={hrefFor(m.key)}
            aria-current={active ? "true" : undefined}
            title={`${m.label} (${m.currency})`}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              active
                ? "bg-bg-surface text-accent-gold"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {m.short} <span className="text-text-muted">{currencySymbol(m.currency)}</span>
          </Link>
        );
      })}
    </div>
  );
}
