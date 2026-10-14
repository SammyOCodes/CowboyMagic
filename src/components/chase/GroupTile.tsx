import Link from "next/link";
import Image from "next/image";
import type { ChaseGroup, SparkPoint } from "@/lib/chase/queries";
import { formatMoney, formatMoneyWhole } from "@/lib/chase/format";
import { currencyOf } from "@/lib/chase/markets";
import { groupHref } from "@/lib/chase/scope";
import ChangeBadge from "./ChangeBadge";
import Sparkline from "./Sparkline";
import TreatmentBadge from "./TreatmentBadge";

interface GroupTileProps {
  group: ChaseGroup;
  index?: SparkPoint[];
}

export default function GroupTile({ group, index }: GroupTileProps) {
  const currency = currencyOf(group.market);
  const reserved = group.treatment === "reserved";
  const year = group.releasedAt?.slice(0, 4);
  return (
    <Link
      href={groupHref(group)}
      className="group flex flex-col bg-bg-secondary border border-border rounded-xl overflow-hidden hover:border-accent-gold/50 transition-colors"
    >
      <div className="relative h-28 bg-bg-surface">
        {group.topCardArt && (
          <Image
            src={group.topCardArt}
            alt=""
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3">
          {reserved ? (
            year && (
              <span className="rounded-full border border-border-light bg-bg-primary/80 px-2 py-0.5 text-[11px] text-text-secondary">
                {year}
              </span>
            )
          ) : (
            <TreatmentBadge treatment={group.treatment} className="bg-bg-primary/80" />
          )}
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="min-w-0">
          <h3 className="font-medium text-text-primary truncate" title={group.setName}>
            {group.setName}
          </h3>
          <p className="text-xs text-text-secondary">
            <span className="uppercase">{group.setCode}</span> · {group.nPriced} priced
            {group.nCards > group.nPriced && ` of ${group.nCards}`}{" "}
            {reserved ? "printings" : "cards"}
          </p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-accent-gold tabular-nums">
              {formatMoneyWhole(group.total, currency)}
            </div>
            <div className="text-[11px] text-text-muted">
              {reserved ? "priced printings at market" : "full set at market"}
            </div>
          </div>
          <Sparkline points={index} width={88} height={32} label={`${group.setName} set price index`} />
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/60">
          <div className="flex gap-3">
            <ChangeBadge value={group.change7d} label="7d" />
            <ChangeBadge value={group.change30d} label="30d" />
          </div>
          <div
            className="text-xs text-text-secondary tabular-nums"
            title={group.topCardName ?? undefined}
          >
            top {formatMoney(group.maxPrice, currency)}
          </div>
        </div>
      </div>
    </Link>
  );
}
