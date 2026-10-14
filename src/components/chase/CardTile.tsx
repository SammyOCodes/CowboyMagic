import Link from "next/link";
import Image from "next/image";
import type { ChaseCard, SparkPoint } from "@/lib/chase/queries";
import { formatMoney } from "@/lib/chase/format";
import { currencyOf } from "@/lib/chase/markets";
import { cardHref, displayTreatment } from "@/lib/chase/scope";
import ChangeBadge from "./ChangeBadge";
import Sparkline from "./Sparkline";
import TreatmentBadge from "./TreatmentBadge";

interface CardTileProps {
  card: ChaseCard;
  spark?: SparkPoint[];
}

export default function CardTile({ card, spark }: CardTileProps) {
  const shown = displayTreatment(card);
  const extra = card.treatments.filter(
    (t) => t !== card.primaryTreatment && t !== "reserved" && t !== "regular"
  ).length;
  const year = card.releasedAt?.slice(0, 4);
  return (
    <Link
      href={cardHref(card)}
      className="group flex flex-col gap-3 bg-bg-secondary border border-border rounded-xl p-3 hover:border-accent-gold/50 transition-colors"
    >
      <div className="relative aspect-[488/680] w-full overflow-hidden rounded-lg bg-bg-surface">
        {card.imageNormal ? (
          <Image
            src={card.imageNormal}
            alt={`${card.name} (${card.setName})`}
            fill
            sizes="(min-width: 1536px) 14vw, (min-width: 1024px) 18vw, (min-width: 640px) 30vw, 48vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-text-muted">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-1">
        <div
          className="text-sm font-medium text-text-primary line-clamp-2 min-h-[2.5rem]"
          title={card.name}
        >
          {card.name}
        </div>
        <div className="text-xs text-text-secondary truncate" title={card.setName}>
          {card.setName} · #{card.collectorNumber}
        </div>
        <div className="flex flex-wrap items-center gap-1 pt-0.5 min-h-[1.375rem]">
          {shown ? (
            <TreatmentBadge treatment={shown} />
          ) : (
            <span className="text-[11px] text-text-muted capitalize">
              {card.rarity}
              {year && ` · ${year}`}
            </span>
          )}
          {extra > 0 && <span className="text-[11px] text-text-muted">+{extra}</span>}
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-semibold leading-tight text-accent-gold tabular-nums">
            {formatMoney(card.price, currencyOf(card.market))}
          </div>
          <div className="flex gap-2 mt-0.5">
            <ChangeBadge value={card.change7d} label="7d" />
            <ChangeBadge value={card.change30d} label="30d" />
          </div>
        </div>
        <Sparkline points={spark} width={80} height={32} />
      </div>
    </Link>
  );
}
