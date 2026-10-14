import Link from "next/link";
import Image from "next/image";
import type { ChaseCard, SparkPoint } from "@/lib/chase/queries";
import { formatMoney } from "@/lib/chase/format";
import { currencyOf, marketInfo, type Market } from "@/lib/chase/markets";
import { cardHref, displayTreatment } from "@/lib/chase/scope";
import ChangeBadge from "./ChangeBadge";
import Sparkline from "./Sparkline";
import TreatmentBadge from "./TreatmentBadge";

interface CardTableProps {
  cards: ChaseCard[];
  sparks: Map<string, SparkPoint[]>;
  market: Market;
}

export default function CardTable({ cards, sparks, market }: CardTableProps) {
  const currency = currencyOf(market);
  return (
    <div className="overflow-x-auto bg-bg-secondary border border-border rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-text-muted border-b border-border">
            <th className="px-3 py-2 font-medium">Card</th>
            <th className="px-3 py-2 font-medium">Set</th>
            <th className="px-3 py-2 font-medium">Treatment</th>
            <th className="px-3 py-2 font-medium text-right">{marketInfo(market).short}</th>
            <th className="px-3 py-2 font-medium text-right">7d</th>
            <th className="px-3 py-2 font-medium text-right">30d</th>
            <th className="px-3 py-2 font-medium text-right" title="Card Kingdom, USD">
              CK retail $
            </th>
            <th className="px-3 py-2 font-medium text-right" title="Card Kingdom, USD">
              CK buylist $
            </th>
            <th className="px-3 py-2 font-medium">90d</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => {
            const treatment = displayTreatment(card);
            return (
              <tr
                key={card.id}
                className="border-b border-border/60 last:border-0 hover:bg-bg-surface/40"
              >
                <td className="px-3 py-2">
                  <Link href={cardHref(card)} className="flex items-center gap-3 min-w-0 group">
                    <span className="relative w-9 h-[50px] shrink-0 rounded overflow-hidden bg-bg-surface">
                      {card.imageSmall && (
                        <Image
                          src={card.imageSmall}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </span>
                    <span className="font-medium text-text-primary group-hover:text-accent-gold truncate max-w-[16rem]">
                      {card.name}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                  <span className="uppercase">{card.setCode}</span> · #{card.collectorNumber}
                </td>
                <td className="px-3 py-2">
                  {treatment ? (
                    <TreatmentBadge treatment={treatment} />
                  ) : (
                    <span className="text-xs text-text-muted capitalize">{card.rarity}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-accent-gold tabular-nums">
                  {formatMoney(card.price, currency)}
                </td>
                <td className="px-3 py-2 text-right">
                  <ChangeBadge value={card.change7d} />
                </td>
                <td className="px-3 py-2 text-right">
                  <ChangeBadge value={card.change30d} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {formatMoney(card.ckPrice, "USD")}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {formatMoney(card.ckBuylist, "USD")}
                </td>
                <td className="px-3 py-2">
                  <Sparkline points={sparks.get(card.id)} width={80} height={24} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
