import type { Db } from "./db";
import { setMeta } from "./db";
import { MARKETS, type Market } from "./markets";

type Point = [date: string, price: number];

const FINISH_FALLBACK = ["foil", "etched", "nonfoil"];

/** How much of a group must have price data before its index line begins. */
const INDEX_COVERAGE = 0.8;

/** Bump when the shape or meaning of the derived tables changes. */
export const STATS_VERSION = "2";

interface CardRow {
  id: string;
  set_code: string;
  set_name: string;
  primary_treatment: string;
  primary_finish: string;
  released_at: string | null;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Value of a date-sorted series on or before `date`; null if it starts later. */
function valueOnOrBefore(series: Point[], date: string): number | null {
  let lo = 0;
  let hi = series.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid][0] <= date) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found >= 0 ? series[found][1] : null;
}

/** Index of the first element >= target in a sorted array. */
function lowerBound(sorted: string[], target: string): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function pctChange(now: number, base: number | null): number | null {
  if (base === null || base <= 0) return null;
  return ((now - base) / base) * 100;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface Member {
  id: string;
  series: Point[] | null;
  price: number | null;
}

interface Group {
  set_code: string;
  set_name: string;
  treatment: string;
  released_at: string | null;
  members: Member[];
}

/**
 * Recomputes the derived tables (per-card stats, per-set stats and set price
 * indexes) for every market from price_points. Cheap enough to run after every sync.
 */
export function rebuildStats(db: Db): { cards: number; groups: number } {
  const cards = db
    .prepare(
      `SELECT id, set_code, set_name, primary_treatment, primary_finish, released_at FROM cards`
    )
    .all() as CardRow[];

  // Latest Card Kingdom retail/buylist per card+finish: a USD reference shown
  // beside every market, so it is computed once.
  const ck = new Map<string, { retail?: number; buylist?: number; date: string }>();
  const ckRows = db
    .prepare(
      `SELECT p.card_id, p.kind, p.finish, p.price, p.date
       FROM price_points p
       JOIN (SELECT card_id, kind, finish, MAX(date) AS d
             FROM price_points WHERE vendor = 'cardkingdom'
             GROUP BY card_id, kind, finish) m
         ON m.card_id = p.card_id AND m.kind = p.kind AND m.finish = p.finish AND m.d = p.date
       WHERE p.vendor = 'cardkingdom'`
    )
    .all() as { card_id: string; kind: string; finish: string; price: number; date: string }[];
  for (const r of ckRows) {
    const key = `${r.card_id}|${r.finish}`;
    const entry = ck.get(key) ?? { date: r.date };
    if (r.kind === "retail") entry.retail = r.price;
    if (r.kind === "buylist") entry.buylist = r.price;
    if (r.date > entry.date) entry.date = r.date;
    ck.set(key, entry);
  }

  const insertStat = db.prepare(
    `INSERT INTO card_stats (card_id, market, price_finish, price, price_date, price_7d, price_30d,
       price_90d, change_7d, change_30d, change_90d, low, high, points, first_date, ck_price, ck_buylist)
     VALUES (@card_id, @market, @price_finish, @price, @price_date, @price_7d, @price_30d,
       @price_90d, @change_7d, @change_30d, @change_90d, @low, @high, @points, @first_date,
       @ck_price, @ck_buylist)`
  );
  const insertGroup = db.prepare(
    `INSERT INTO group_stats (group_key, market, set_code, set_name, treatment, released_at, n_cards,
       n_priced, total, avg, max_price, top_card_id, change_7d, change_30d, index_start)
     VALUES (@group_key, @market, @set_code, @set_name, @treatment, @released_at, @n_cards,
       @n_priced, @total, @avg, @max_price, @top_card_id, @change_7d, @change_30d, @index_start)`
  );
  const insertIndex = db.prepare(
    `INSERT INTO group_index (group_key, market, date, total) VALUES (?, ?, ?, ?)`
  );
  const selectSeries = db.prepare(
    `SELECT card_id, finish, date, price FROM price_points
     WHERE vendor = ? AND kind = 'retail'
     ORDER BY card_id, finish, date`
  );

  let groupCount = 0;

  const buildMarket = (market: Market, vendor: string) => {
    // Retail series for this market, by card then finish.
    const byCard = new Map<string, Map<string, Point[]>>();
    const dateAxis = new Set<string>();
    for (const r of selectSeries.iterate(vendor) as IterableIterator<{
      card_id: string;
      finish: string;
      date: string;
      price: number;
    }>) {
      let finishes = byCard.get(r.card_id);
      if (!finishes) byCard.set(r.card_id, (finishes = new Map()));
      let pts = finishes.get(r.finish);
      if (!pts) finishes.set(r.finish, (pts = []));
      pts.push([r.date, r.price]);
      dateAxis.add(r.date);
    }
    // One shared axis: every group index is forward-filled over it, so indexes
    // from different sets can be summed date by date.
    const allDates = [...dateAxis].sort();

    const groups = new Map<string, Group>();

    for (const card of cards) {
      const finishes = byCard.get(card.id);
      let finish: string | null = null;
      if (finishes) {
        finish = finishes.has(card.primary_finish)
          ? card.primary_finish
          : FINISH_FALLBACK.find((f) => finishes.has(f)) ?? null;
      }
      const series = finish ? finishes!.get(finish)! : null;

      let price: number | null = null;
      if (series && series.length > 0) {
        const [lastDate, last] = series[series.length - 1];
        price = last;
        const base7 = valueOnOrBefore(series, addDays(lastDate, -7));
        const base30 = valueOnOrBefore(series, addDays(lastDate, -30));
        const base90 = valueOnOrBefore(series, addDays(lastDate, -90));
        const windowStart = addDays(lastDate, -90);
        let low = Infinity;
        let high = -Infinity;
        for (const [d, p] of series) {
          if (d < windowStart) continue;
          if (p < low) low = p;
          if (p > high) high = p;
        }
        const ckEntry = ck.get(`${card.id}|${finish}`);
        const ckFresh = ckEntry && ckEntry.date >= addDays(lastDate, -14);
        insertStat.run({
          card_id: card.id,
          market,
          price_finish: finish,
          price,
          price_date: lastDate,
          price_7d: base7,
          price_30d: base30,
          price_90d: base90,
          change_7d: pctChange(price, base7),
          change_30d: pctChange(price, base30),
          change_90d: pctChange(price, base90),
          low: Number.isFinite(low) ? low : null,
          high: Number.isFinite(high) ? high : null,
          points: series.length,
          first_date: series[0][0],
          ck_price: ckFresh ? ckEntry!.retail ?? null : null,
          ck_buylist: ckFresh ? ckEntry!.buylist ?? null : null,
        });
      }

      const key = `${card.set_code}~${card.primary_treatment}`;
      let group = groups.get(key);
      if (!group) {
        group = {
          set_code: card.set_code,
          set_name: card.set_name,
          treatment: card.primary_treatment,
          released_at: card.released_at,
          members: [],
        };
        groups.set(key, group);
      }
      group.members.push({ id: card.id, series, price });
    }

    for (const [key, group] of groups) {
      const priced = group.members.filter(
        (m): m is Member & { series: Point[]; price: number } =>
          m.series !== null && m.price !== null
      );
      let total: number | null = null;
      let avg: number | null = null;
      let maxPrice: number | null = null;
      let topCard: string | null = null;
      for (const m of priced) {
        total = (total ?? 0) + m.price;
        if (maxPrice === null || m.price > maxPrice) {
          maxPrice = m.price;
          topCard = m.id;
        }
      }
      if (total !== null) avg = total / priced.length;

      // Price index: constant-composition basket, forward-filled across gaps.
      let change7: number | null = null;
      let change30: number | null = null;
      let indexStart: string | null = null;
      if (priced.length > 0) {
        const firstDates = priced.map((m) => m.series[0][0]).sort();
        indexStart = firstDates[Math.max(0, Math.ceil(priced.length * INDEX_COVERAGE) - 1)];
        const basket = priced.filter((m) => m.series[0][0] <= indexStart!);
        const dates = allDates.slice(lowerBound(allDates, indexStart));
        const totals = new Float64Array(dates.length);
        for (const m of basket) {
          let i = 0;
          let current = valueOnOrBefore(m.series, indexStart) ?? m.series[0][1];
          for (let di = 0; di < dates.length; di++) {
            while (i < m.series.length && m.series[i][0] <= dates[di]) {
              current = m.series[i][1];
              i++;
            }
            totals[di] += current;
          }
        }
        const indexSeries: Point[] = dates.map((d, i) => [d, totals[i]]);
        for (const [d, t] of indexSeries) insertIndex.run(key, market, d, round2(t));
        if (indexSeries.length > 0) {
          const [lastDate, lastTotal] = indexSeries[indexSeries.length - 1];
          change7 = pctChange(lastTotal, valueOnOrBefore(indexSeries, addDays(lastDate, -7)));
          change30 = pctChange(lastTotal, valueOnOrBefore(indexSeries, addDays(lastDate, -30)));
        }
      }

      insertGroup.run({
        group_key: key,
        market,
        set_code: group.set_code,
        set_name: group.set_name,
        treatment: group.treatment,
        released_at: group.released_at,
        n_cards: group.members.length,
        n_priced: priced.length,
        total: total === null ? null : round2(total),
        avg: avg === null ? null : round2(avg),
        max_price: maxPrice,
        top_card_id: topCard,
        change_7d: change7,
        change_30d: change30,
        index_start: indexStart,
      });
    }
    groupCount = groups.size;
  };

  db.transaction(() => {
    db.exec("DELETE FROM card_stats; DELETE FROM group_stats; DELETE FROM group_index;");
    for (const m of MARKETS) buildMarket(m.key, m.vendor);
  })();

  setMeta(db, "stats_rebuilt_at", new Date().toISOString());
  setMeta(db, "stats_version", STATS_VERSION);
  return { cards: cards.length, groups: groupCount };
}
