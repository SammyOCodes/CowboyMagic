import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ChaseFilters, SortControls } from "@/components/chase/ChaseControls";
import CardTable from "@/components/chase/CardTable";
import CardTile from "@/components/chase/CardTile";
import MarketTabs from "@/components/chase/MarketTabs";
import Pagination from "@/components/chase/Pagination";
import SyncStatus, { EmptyState } from "@/components/chase/SyncStatus";
import { filtersToParams, parseFilters } from "@/lib/chase/filters";
import { formatMoneyWhole } from "@/lib/chase/format";
import { currencyOf } from "@/lib/chase/markets";
import { getFacets, getOverview, getSparklines, queryCards } from "@/lib/chase/queries";
import { SCOPES, type Scope } from "@/lib/chase/scope";

type Params = Record<string, string | string[] | undefined>;

export default async function ExplorerView({
  scope,
  searchParams,
}: {
  scope: Scope;
  searchParams: Promise<Params>;
}) {
  const info = SCOPES[scope];
  const filters = parseFilters(await searchParams, scope);
  const currency = currencyOf(filters.market);
  const overview = getOverview(scope, filters.market);
  if (overview.cards === 0) return <EmptyState />;

  const hrefFor = (patch: Partial<typeof filters>) => {
    const params = filtersToParams({ ...filters, ...patch }, scope);
    return `${info.basePath}${params.size ? `?${params}` : ""}`;
  };

  const result = queryCards(filters, scope);
  if (filters.page > result.pages) redirect(hrefFor({ page: result.pages }));

  const facets = getFacets(scope);
  const sparks = getSparklines(
    result.cards.map((c) => c.id),
    filters.market
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-3">
          <div>
            <h1 className="font-display text-3xl text-accent-gold">{info.title}</h1>
            <p className="text-sm text-text-secondary mt-1 max-w-xl">{info.subtitle}</p>
          </div>
          <MarketTabs
            current={filters.market}
            hrefFor={(market) => hrefFor({ market, page: 1 })}
          />
        </div>
        <SyncStatus overview={overview} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] items-start">
        <aside className="lg:sticky lg:top-0 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <Suspense fallback={null}>
            <ChaseFilters facets={facets} currency={currency} />
          </Suspense>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-secondary" aria-live="polite">
              <span className="text-text-primary font-semibold">
                {result.total.toLocaleString()}
              </span>{" "}
              {scope === "reserved" ? "printings" : "cards"} ·{" "}
              <span className="text-text-primary font-semibold">
                {formatMoneyWhole(result.totalValue, currency)}
              </span>{" "}
              combined market value
            </p>
            <Suspense fallback={null}>
              <SortControls />
            </Suspense>
          </div>

          {result.cards.length === 0 ? (
            <div className="bg-bg-secondary border border-border rounded-xl p-10 text-center text-text-secondary">
              No cards match these filters.
            </div>
          ) : filters.view === "table" ? (
            <CardTable cards={result.cards} sparks={sparks} market={filters.market} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {result.cards.map((card) => (
                <CardTile key={card.id} card={card} spark={sparks.get(card.id)} />
              ))}
            </div>
          )}

          <Pagination
            page={filters.page}
            pages={result.pages}
            hrefFor={(page) => hrefFor({ page })}
          />
        </section>
      </div>
    </div>
  );
}
