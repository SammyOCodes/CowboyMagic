import { Database } from "lucide-react";
import type { Overview } from "@/lib/chase/queries";
import { formatDate, timeAgo } from "@/lib/chase/format";

export function EmptyState() {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-10 text-center max-w-xl mx-auto">
      <Database className="w-10 h-10 text-accent-gold mx-auto mb-3" />
      <h2 className="font-display text-xl text-accent-gold mb-2">No chase cards yet</h2>
      <p className="text-sm text-text-secondary mb-4">
        The price database is empty. Pull the chase-card universe from Scryfall (takes about a
        minute):
      </p>
      <pre className="inline-block bg-bg-primary border border-border rounded-lg px-4 py-2 text-sm text-accent-gold">
        npm run sync
      </pre>
    </div>
  );
}

export default function SyncStatus({ overview }: { overview: Overview }) {
  const { stale } = overview;
  return (
    <div className="text-xs text-text-muted space-y-0.5 sm:text-right">
      <div>
        {overview.cards.toLocaleString()} cards tracked · {overview.sets.toLocaleString()} sets
      </div>
      <div>
        {overview.historyDays > 0
          ? overview.historyDays === 1
            ? `1 day of history (${formatDate(overview.newestDate)}); run the history backfill`
            : `${overview.historyDays} days of history (${formatDate(overview.oldestDate)} – ${formatDate(overview.newestDate)})`
          : "No price history yet"}
      </div>
      <div className={stale ? "text-[var(--status-critical)]" : undefined}>
        Prices synced {timeAgo(overview.lastScryfallSync)}
        {stale && " — run npm run sync"}
      </div>
    </div>
  );
}
