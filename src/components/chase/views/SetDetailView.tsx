import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import CardTable from "@/components/chase/CardTable";
import CardTile from "@/components/chase/CardTile";
import ChangeBadge from "@/components/chase/ChangeBadge";
import MarketTabs from "@/components/chase/MarketTabs";
import PriceChart, { type ChartRow } from "@/components/chase/PriceChart";
import TreatmentBadge from "@/components/chase/TreatmentBadge";
import { SORT_OPTIONS, parseMarket, type SortKey } from "@/lib/chase/filters";
import { formatMoney, formatMoneyWhole } from "@/lib/chase/format";
import { currencyOf } from "@/lib/chase/markets";
import { getGroup, getGroupCards, getGroupIndexes, getSparklines } from "@/lib/chase/queries";
import { SCOPES, scopeOfGroup, type Scope } from "@/lib/chase/scope";

type Params = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-text-primary tabular-nums">{children}</div>
    </div>
  );
}

export default async function SetDetailView({
  scope,
  groupKey,
  searchParams,
}: {
  scope: Scope;
  groupKey: string;
  searchParams: Promise<Params>;
}) {
  const raw = await searchParams;
  const market = parseMarket(raw, scope);
  const group = getGroup(groupKey, market);
  if (!group) notFound();

  const owner = scopeOfGroup(group);
  if (owner !== scope) {
    redirect(`${SCOPES[owner].basePath}/sets/${encodeURIComponent(groupKey)}`);
  }

  const info = SCOPES[scope];
  const currency = currencyOf(market);
  const sortParam = one(raw.sort);
  const sort: SortKey = SORT_OPTIONS.some((o) => o.key === sortParam)
    ? (sortParam as SortKey)
    : "price";
  const dir = one(raw.dir) === "asc" ? "asc" : "desc";
  const view = one(raw.view) === "table" ? "table" : "grid";

  const cards = getGroupCards(groupKey, market, sort, dir);
  const sparks = getSparklines(
    cards.map((c) => c.id),
    market
  );
  const index = getGroupIndexes([groupKey], market).get(groupKey) ?? [];
  const chartRows: ChartRow[] = index.map(([date, total]) => ({ date, total }));
  const pricedAll = group.nPriced === group.nCards;
  const topCard = cards.find((c) => c.id === group.topCardId);
  const reserved = scope === "reserved";

  const linkFor = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const next = { sort, dir, view, ...patch };
    if (market !== info.defaultMarket) p.set("mkt", market);
    if (next.sort !== "price") p.set("sort", next.sort);
    if (next.dir !== "desc") p.set("dir", next.dir);
    if (next.view !== "grid") p.set("view", next.view);
    return `${info.basePath}/sets/${encodeURIComponent(groupKey)}${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`${info.basePath}/sets`}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent-gold"
        >
          <ArrowLeft className="w-4 h-4" /> All {reserved ? "sets" : "chase sets"}
        </Link>
        <MarketTabs
          current={market}
          hrefFor={(m) =>
            `${info.basePath}/sets/${encodeURIComponent(groupKey)}${m === info.defaultMarket ? "" : `?mkt=${m}`}`
          }
        />
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-accent-gold">{group.setName}</h1>
          {!reserved && <TreatmentBadge treatment={group.treatment} />}
        </div>
        <p className="text-text-secondary text-sm">
          <span className="uppercase">{group.setCode}</span> · {group.nPriced}
          {!pricedAll && ` of ${group.nCards}`} priced {reserved ? "printings" : "cards"}
          {group.releasedAt && ` · released ${group.releasedAt.slice(0, 4)}`}
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label={reserved ? "Priced printings at market" : "Full set at market"}>
          {formatMoneyWhole(group.total, currency)}
        </Stat>
        <Stat label="Average card">{formatMoney(group.avg, currency)}</Stat>
        <Stat label="Top card">
          {formatMoney(group.maxPrice, currency)}
          {topCard && (
            <Link
              href={`${info.basePath}/card/${topCard.id}`}
              className="block text-xs font-normal text-text-secondary hover:text-accent-gold truncate"
            >
              {topCard.name}
            </Link>
          )}
        </Stat>
        <Stat label="7-day change">
          <ChangeBadge value={group.change7d} />
        </Stat>
        <Stat label="30-day change">
          <ChangeBadge value={group.change30d} />
        </Stat>
      </div>

      <PriceChart
        title="Set price index (sum of card prices)"
        data={chartRows}
        series={[{ key: "total", label: "Set value", color: "#3987e5" }]}
        currency={currency}
        height={280}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-accent-gold">
          {reserved ? "Printings" : "Cards"}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-muted">Sort:</span>
          {SORT_OPTIONS.slice(0, 4).map((o) => (
            <Link
              key={o.key}
              href={linkFor({
                sort: o.key,
                dir:
                  o.key === sort
                    ? dir === "desc"
                      ? "asc"
                      : "desc"
                    : o.key === "name"
                      ? "asc"
                      : "desc",
              })}
              aria-current={o.key === sort ? "true" : undefined}
              className={
                o.key === sort
                  ? "px-2.5 py-1 rounded-lg bg-bg-surface text-accent-gold"
                  : "px-2.5 py-1 rounded-lg text-text-secondary hover:text-text-primary"
              }
            >
              {o.label}
              {o.key === sort && (dir === "desc" ? " ↓" : " ↑")}
            </Link>
          ))}
          <span className="mx-1 text-border">|</span>
          <Link
            href={linkFor({ view: view === "grid" ? "table" : "grid" })}
            className="px-2.5 py-1 rounded-lg border border-border text-text-secondary hover:text-accent-gold"
          >
            {view === "grid" ? "Table view" : "Grid view"}
          </Link>
        </div>
      </div>

      {view === "table" ? (
        <CardTable cards={cards} sparks={sparks} market={market} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {cards.map((card) => (
            <CardTile key={card.id} card={card} spark={sparks.get(card.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
