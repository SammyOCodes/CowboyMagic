import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ChangeBadge from "@/components/chase/ChangeBadge";
import CardTile from "@/components/chase/CardTile";
import MarketTabs from "@/components/chase/MarketTabs";
import PriceChart, { type ChartRow, type ChartSeries } from "@/components/chase/PriceChart";
import TreatmentBadge from "@/components/chase/TreatmentBadge";
import { parseMarket } from "@/lib/chase/filters";
import { formatDate, formatMoney } from "@/lib/chase/format";
import { currencyOf, marketInfo, type Market } from "@/lib/chase/markets";
import {
  getCard,
  getFinishPrices,
  getOtherPrintings,
  getSeries,
  getSparklines,
} from "@/lib/chase/queries";
import { SCOPES, type Scope } from "@/lib/chase/scope";

type Params = Record<string, string | string[] | undefined>;

const FINISH_LABEL: Record<string, string> = {
  nonfoil: "Non-foil",
  foil: "Foil",
  etched: "Etched foil",
};

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-text-primary tabular-nums">{children}</div>
    </div>
  );
}

const ext =
  "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:text-accent-gold hover:border-accent-gold/40";

/** USD markets chart TCGplayer + Card Kingdom together; Cardmarket (EUR) stands alone. */
function seriesFor(market: Market): ChartSeries[] {
  if (currencyOf(market) === "EUR") {
    return [{ key: "cardmarket", label: "Cardmarket", color: "#3987e5" }];
  }
  return [
    { key: "tcgplayer", label: "TCGplayer market", color: "#3987e5" },
    { key: "cardkingdom", label: "Card Kingdom retail", color: "#d95926" },
    { key: "buylist", label: "Card Kingdom buylist", color: "#199e70" },
  ];
}

export default async function CardDetailView({
  scope,
  id,
  searchParams,
}: {
  scope: Scope;
  id: string;
  searchParams: Promise<Params>;
}) {
  const raw = await searchParams;
  const market = parseMarket(raw, scope);
  const card = getCard(id, market);
  if (!card) notFound();

  // A Reserved List card opened under /chase (or vice versa) belongs to the other tracker.
  const owner: Scope = card.reserved ? "reserved" : "chase";
  if (owner !== scope) redirect(`${SCOPES[owner].basePath}/card/${id}`);

  const base = SCOPES[scope].basePath;
  const currency = currencyOf(market);
  const info = marketInfo(market);
  const series = getSeries(card);
  const chartRows: ChartRow[] = series.map((r) => ({
    date: r.date,
    tcgplayer: r.tcgplayer,
    cardmarket: r.cardmarket,
    cardkingdom: r.cardkingdom,
    buylist: r.buylist,
  }));
  const finishPrices = getFinishPrices(card.id, market);
  const others = getOtherPrintings(card, market);
  const otherSparks = getSparklines(
    others.map((c) => c.id),
    market
  );
  const image = card.imageLarge ?? card.imageNormal;
  const finishLabel = FINISH_LABEL[card.priceFinish ?? card.primaryFinish] ?? "";
  const hasUsdRef = card.ckPrice !== null || card.ckBuylist !== null;
  const tagsToShow = card.treatments.filter((t) => t !== "reserved" && t !== "regular");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={base}
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent-gold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to explorer
        </Link>
        <MarketTabs
          current={market}
          hrefFor={(m) => `${base}/card/${id}${m === SCOPES[scope].defaultMarket ? "" : `?mkt=${m}`}`}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="relative aspect-[672/936] w-full max-w-sm mx-auto lg:mx-0 rounded-2xl overflow-hidden bg-bg-surface shadow-lg shadow-black/50">
            {image && (
              <Image
                src={image}
                alt={`${card.name} (${card.setName})`}
                fill
                sizes="(min-width: 1024px) 22rem, 90vw"
                className="object-cover"
                unoptimized
                priority
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
            {card.scryfallUri && (
              <a href={card.scryfallUri} target="_blank" rel="noreferrer" className={ext}>
                Scryfall <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {card.tcgplayerId && (
              <a
                href={`https://www.tcgplayer.com/product/${card.tcgplayerId}`}
                target="_blank"
                rel="noreferrer"
                className={ext}
              >
                TCGplayer <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <a
              href={`https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${encodeURIComponent(card.name)}`}
              target="_blank"
              rel="noreferrer"
              className={ext}
            >
              Card Kingdom <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(card.name)}`}
              target="_blank"
              rel="noreferrer"
              className={ext}
            >
              Cardmarket <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="space-y-6 min-w-0">
          <header className="space-y-2">
            <h1 className="font-display text-3xl text-accent-gold leading-tight">{card.name}</h1>
            <p className="text-text-secondary">
              {card.setName} ({card.setCode.toUpperCase()}) · #{card.collectorNumber} ·{" "}
              <span className="capitalize">{card.rarity}</span>
              {card.releasedAt && ` · released ${formatDate(card.releasedAt)}`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {card.reserved && <TreatmentBadge treatment="reserved" />}
              {tagsToShow.map((t) => (
                <TreatmentBadge key={t} treatment={t} />
              ))}
              {finishLabel && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-secondary">
                  {finishLabel}
                </span>
              )}
            </div>
          </header>

          <div className="bg-bg-secondary border border-border rounded-xl p-5 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-muted">
                {info.label}
                {finishLabel && ` · ${finishLabel}`}
              </div>
              <div className="text-4xl font-semibold text-accent-gold tabular-nums">
                {card.price === null ? (
                  <span className="text-2xl text-text-muted">No {info.short} price</span>
                ) : (
                  formatMoney(card.price, currency)
                )}
              </div>
              {card.priceDate && (
                <div className="text-xs text-text-muted mt-0.5">as of {formatDate(card.priceDate)}</div>
              )}
            </div>
            <div className="flex gap-5 pb-1">
              <div className="space-y-0.5">
                <div className="text-[11px] text-text-muted">7 days</div>
                <ChangeBadge value={card.change7d} />
              </div>
              <div className="space-y-0.5">
                <div className="text-[11px] text-text-muted">30 days</div>
                <ChangeBadge value={card.change30d} />
              </div>
              <div className="space-y-0.5">
                <div className="text-[11px] text-text-muted">90 days</div>
                <ChangeBadge value={card.change90d} />
              </div>
            </div>
          </div>

          <PriceChart
            title={`Price history${finishLabel ? ` · ${finishLabel}` : ""}`}
            data={chartRows}
            series={seriesFor(market)}
            currency={currency}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="90-day low">{formatMoney(card.low, currency)}</Stat>
            <Stat label="90-day high">{formatMoney(card.high, currency)}</Stat>
            {hasUsdRef && (
              <>
                <Stat label="Card Kingdom retail">{formatMoney(card.ckPrice, "USD")}</Stat>
                <Stat label="Card Kingdom buylist">{formatMoney(card.ckBuylist, "USD")}</Stat>
              </>
            )}
          </div>

          {finishPrices.length > 1 && (
            <section>
              <h2 className="text-sm font-semibold text-text-primary mb-2">
                Prices by finish ({info.short})
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {finishPrices.map((fp) => (
                  <li
                    key={fp.finish}
                    className="bg-bg-secondary border border-border rounded-xl px-4 py-3 flex items-baseline justify-between"
                  >
                    <span className="text-sm text-text-secondary">
                      {FINISH_LABEL[fp.finish] ?? fp.finish}
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatMoney(fp.price, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-accent-gold">Other tracked printings</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {others.map((c) => (
              <CardTile key={c.id} card={c} spark={otherSparks.get(c.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
