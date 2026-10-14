import Link from "next/link";
import GroupTile from "@/components/chase/GroupTile";
import MarketTabs from "@/components/chase/MarketTabs";
import Pagination from "@/components/chase/Pagination";
import PriceChart from "@/components/chase/PriceChart";
import SyncStatus, { EmptyState } from "@/components/chase/SyncStatus";
import { treatmentLabel } from "@/lib/chase/config";
import { parseMarket } from "@/lib/chase/filters";
import { currencyOf, currencySymbol } from "@/lib/chase/markets";
import {
  getGroupIndexes,
  getOverview,
  getScopeIndex,
  getTreatmentFacets,
  queryGroups,
  type GroupSort,
} from "@/lib/chase/queries";
import { SCOPES, type Scope } from "@/lib/chase/scope";

type Params = Record<string, string | string[] | undefined>;

const SORTS: { key: GroupSort; label: string }[] = [
  { key: "total", label: "Set value" },
  { key: "avg", label: "Average card price" },
  { key: "max", label: "Top card price" },
  { key: "change7d", label: "7-day change" },
  { key: "change30d", label: "30-day change" },
  { key: "cards", label: "Card count" },
  { key: "released", label: "Release date" },
];

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function numOrNull(v: string): number | null {
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const fieldClass =
  "bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-gold/60";

export default async function SetsView({
  scope,
  searchParams,
}: {
  scope: Scope;
  searchParams: Promise<Params>;
}) {
  const raw = await searchParams;
  const info = SCOPES[scope];
  const market = parseMarket(raw, scope);
  const currency = currencyOf(market);
  const overview = getOverview(scope, market);
  if (overview.cards === 0) return <EmptyState />;

  const sortParam = one(raw.sort);
  const sort = (SORTS.some((s) => s.key === sortParam) ? sortParam : "total") as GroupSort;
  const dir = one(raw.dir) === "asc" ? "asc" : "desc";
  const page = Math.max(1, Math.floor(Number(one(raw.page))) || 1);
  const filters = {
    q: one(raw.q).slice(0, 80),
    market,
    treatment: scope === "chase" ? one(raw.t) : "",
    minCards: Math.max(1, Math.floor(Number(one(raw.mincards))) || 1),
    minTotal: numOrNull(one(raw.mintotal)),
    sort,
    dir: dir as "asc" | "desc",
    page,
  };

  const result = queryGroups(filters, scope);
  const indexes = getGroupIndexes(
    result.groups.map((g) => g.key),
    market
  );
  const treatments = scope === "chase" ? getTreatmentFacets(scope, market) : [];
  const overall = getScopeIndex(scope, market);

  const hrefFor = (patch: { page?: number; market?: typeof market }) => {
    const p = new URLSearchParams();
    const m = patch.market ?? market;
    const pg = patch.page ?? 1;
    if (m !== info.defaultMarket) p.set("mkt", m);
    if (filters.q) p.set("q", filters.q);
    if (filters.treatment) p.set("t", filters.treatment);
    if (filters.minCards > 1) p.set("mincards", String(filters.minCards));
    if (filters.minTotal !== null) p.set("mintotal", String(filters.minTotal));
    if (sort !== "total") p.set("sort", sort);
    if (dir === "asc") p.set("dir", "asc");
    if (pg > 1) p.set("page", String(pg));
    return `${info.basePath}/sets${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-3">
          <div>
            <h1 className="font-display text-3xl text-accent-gold">{info.setsTitle}</h1>
            <p className="text-sm text-text-secondary mt-1 max-w-xl">{info.setsSubtitle}</p>
          </div>
          <MarketTabs current={market} hrefFor={(m) => hrefFor({ market: m })} />
        </div>
        <SyncStatus overview={overview} />
      </div>

      {overall.length >= 2 && (
        <PriceChart
          title={`All tracked ${scope === "reserved" ? "Reserved List printings" : "chase cards"}, combined`}
          data={overall.map(([date, total]) => ({ date, total }))}
          series={[{ key: "total", label: "Combined value", color: "#3987e5" }]}
          currency={currency}
          height={240}
        />
      )}

      <form
        method="get"
        action={`${info.basePath}/sets`}
        className="bg-bg-secondary border border-border rounded-xl p-4 flex flex-wrap items-end gap-3"
      >
        {market !== info.defaultMarket && <input type="hidden" name="mkt" value={market} />}
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Search
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Set name or code"
            className={fieldClass}
          />
        </label>
        {scope === "chase" && (
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Treatment
            <select name="t" defaultValue={filters.treatment} className={fieldClass}>
              <option value="">All treatments</option>
              {treatments.map((t) => (
                <option key={t.key} value={t.key}>
                  {treatmentLabel(t.key)} ({t.count})
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Min. cards
          <input
            type="number"
            name="mincards"
            min={1}
            defaultValue={filters.minCards > 1 ? filters.minCards : ""}
            placeholder="1"
            className={`${fieldClass} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Min. set value ({currencySymbol(currency)})
          <input
            type="number"
            name="mintotal"
            min={0}
            defaultValue={filters.minTotal ?? ""}
            placeholder="0"
            className={`${fieldClass} w-28`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Sort by
          <select name="sort" defaultValue={sort} className={fieldClass}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Order
          <select name="dir" defaultValue={dir} className={fieldClass}>
            <option value="desc">High to low</option>
            <option value="asc">Low to high</option>
          </select>
        </label>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-accent-orange hover:bg-accent-orange-hover text-sm font-medium text-white transition-colors"
        >
          Apply
        </button>
        <Link
          href={`${info.basePath}/sets${market !== info.defaultMarket ? `?mkt=${market}` : ""}`}
          className="text-sm text-text-secondary hover:text-accent-gold py-1.5"
        >
          Reset
        </Link>
      </form>

      <p className="text-sm text-text-secondary">
        <span className="text-text-primary font-semibold">{result.total.toLocaleString()}</span>{" "}
        {scope === "reserved" ? "sets with Reserved List cards" : "chase sets"}
      </p>

      {result.groups.length === 0 ? (
        <div className="bg-bg-secondary border border-border rounded-xl p-10 text-center text-text-secondary">
          No sets match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {result.groups.map((g) => (
            <GroupTile key={g.key} group={g} index={indexes.get(g.key)} />
          ))}
        </div>
      )}

      <Pagination
        page={Math.min(page, result.pages)}
        pages={result.pages}
        hrefFor={(p) => hrefFor({ page: p })}
      />
    </div>
  );
}
