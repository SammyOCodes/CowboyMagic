import type { ScryfallCard } from "@/types";
import {
  ScryfallApiError,
  getCardCollection,
  getCardImage,
  searchCards,
  setRateLimitRetries,
} from "@/lib/scryfall/client";
import { universeQueries } from "./config";
import { classify, colorString } from "./classify";
import { setMeta, type Db } from "./db";
import { rebuildStats } from "./stats";

export interface ScryfallSyncReport {
  date: string;
  perQuery: { id: string; query: string; cards: number; error?: string }[];
  discovered: number;
  refreshedKnown: number;
  pricedRows: number;
}

type Log = (msg: string) => void;

const SEARCH_EXTRA = { unique: "prints", include_variations: "true" };

async function runQuery(query: string, log: Log): Promise<ScryfallCard[]> {
  const out: ScryfallCard[] = [];
  for (let page = 1; ; page++) {
    const res = await searchCards(query, page, "released", SEARCH_EXTRA);
    out.push(...res.data);
    if (!res.has_more) break;
    if (page % 5 === 0) log(`    ...page ${page} (${out.length}/${res.total_cards})`);
  }
  return out;
}

const UPSERT_CARD = `
INSERT INTO cards (
  id, oracle_id, name, set_code, set_name, set_type, released_at, collector_number, rarity,
  mana_cost, type_line, colors, border_color, frame_effects, promo_types, finishes,
  treatments, primary_treatment, primary_finish, reserved,
  image_small, image_normal, image_large, image_art, scryfall_uri, tcgplayer_id,
  first_seen, last_seen
) VALUES (
  @id, @oracle_id, @name, @set_code, @set_name, @set_type, @released_at, @collector_number, @rarity,
  @mana_cost, @type_line, @colors, @border_color, @frame_effects, @promo_types, @finishes,
  @treatments, @primary_treatment, @primary_finish, @reserved,
  @image_small, @image_normal, @image_large, @image_art, @scryfall_uri, @tcgplayer_id,
  @today, @today
)
ON CONFLICT(id) DO UPDATE SET
  oracle_id = excluded.oracle_id, name = excluded.name, set_code = excluded.set_code,
  set_name = excluded.set_name, set_type = excluded.set_type, released_at = excluded.released_at,
  collector_number = excluded.collector_number, rarity = excluded.rarity,
  mana_cost = excluded.mana_cost, type_line = excluded.type_line, colors = excluded.colors,
  border_color = excluded.border_color, frame_effects = excluded.frame_effects,
  promo_types = excluded.promo_types, finishes = excluded.finishes,
  treatments = excluded.treatments, primary_treatment = excluded.primary_treatment,
  primary_finish = excluded.primary_finish, reserved = excluded.reserved,
  image_small = excluded.image_small, image_normal = excluded.image_normal,
  image_large = excluded.image_large, image_art = excluded.image_art,
  scryfall_uri = excluded.scryfall_uri, tcgplayer_id = excluded.tcgplayer_id,
  last_seen = excluded.last_seen
`;

const UPSERT_PRICE = `
INSERT INTO price_points (card_id, date, vendor, kind, finish, price, source)
VALUES (?, ?, ?, 'retail', ?, ?, 'scryfall')
ON CONFLICT(card_id, date, vendor, kind, finish)
DO UPDATE SET price = excluded.price, source = excluded.source
WHERE price_points.source = 'scryfall'
`;

/** Scryfall's price fields: TCGplayer in USD, Cardmarket in EUR. */
const PRICE_FIELDS: [field: string, vendor: string, finish: string][] = [
  ["usd", "tcgplayer", "nonfoil"],
  ["usd_foil", "tcgplayer", "foil"],
  ["usd_etched", "tcgplayer", "etched"],
  ["eur", "cardmarket", "nonfoil"],
  ["eur_foil", "cardmarket", "foil"],
  ["eur_etched", "cardmarket", "etched"],
];

function toRow(card: ScryfallCard, today: string) {
  const c = classify(card);
  const face = card.card_faces?.[0];
  return {
    id: card.id,
    oracle_id: card.oracle_id ?? null,
    name: card.name,
    set_code: card.set,
    set_name: card.set_name,
    set_type: card.set_type ?? null,
    released_at: card.released_at ?? null,
    collector_number: card.collector_number ?? null,
    rarity: card.rarity,
    mana_cost: card.mana_cost ?? face?.mana_cost ?? null,
    type_line: card.type_line ?? face?.type_line ?? null,
    colors: colorString(card),
    border_color: card.border_color ?? null,
    frame_effects: JSON.stringify(card.frame_effects ?? []),
    promo_types: JSON.stringify(card.promo_types ?? []),
    finishes: JSON.stringify(card.finishes ?? []),
    treatments: JSON.stringify(c.treatments),
    primary_treatment: c.primaryTreatment,
    primary_finish: c.primaryFinish,
    reserved: card.reserved ? 1 : 0,
    image_small: getCardImage(card, "small") || null,
    image_normal: getCardImage(card, "normal") || null,
    image_large: getCardImage(card, "large") || null,
    image_art: getCardImage(card, "art_crop") || null,
    scryfall_uri: card.scryfall_uri,
    tcgplayer_id: card.tcgplayer_id ?? card.tcgplayer_etched_id ?? null,
    today,
  };
}

/**
 * Pulls the chase universe from Scryfall, refreshes cards we already track that
 * fell out of the universe (so their price series don't silently stop), stores
 * today's TCGplayer prices, and rebuilds derived stats.
 */
export async function syncScryfall(db: Db, log: Log = console.log): Promise<ScryfallSyncReport> {
  // Batch job: wait out rate limits rather than failing, but never hammer through them.
  setRateLimitRetries(3);
  const today = new Date().toISOString().slice(0, 10);
  const found = new Map<string, ScryfallCard>();
  const report: ScryfallSyncReport = {
    date: today,
    perQuery: [],
    discovered: 0,
    refreshedKnown: 0,
    pricedRows: 0,
  };

  for (const { id, query } of universeQueries()) {
    log(`  ${id}: ${query}`);
    try {
      const cards = await runQuery(query, log);
      for (const c of cards) found.set(c.id, c);
      report.perQuery.push({ id, query, cards: cards.length });
      log(`    ${cards.length} cards`);
    } catch (err) {
      if (err instanceof ScryfallApiError && err.code === "not_found") {
        report.perQuery.push({ id, query, cards: 0 });
        log("    0 cards");
      } else {
        const message = err instanceof Error ? err.message : String(err);
        report.perQuery.push({ id, query, cards: 0, error: message });
        log(`    skipped: ${message}`);
      }
    }
  }
  report.discovered = found.size;

  // All-or-nothing: a partial universe would make every unseen card look like it
  // fell out of the chase list, and would write an inconsistent snapshot.
  const failed = report.perQuery.filter((q) => q.error);
  if (failed.length > 0) {
    throw new Error(
      `${failed.length} Scryfall quer${failed.length === 1 ? "y" : "ies"} failed, so nothing was written ` +
        `(${failed.map((q) => q.id).join(", ")}). Try again later.`
    );
  }

  // Known cards that no query returned this run (e.g. fell under the price floor).
  const known = db.prepare("SELECT id FROM cards").all() as { id: string }[];
  const missing = known.filter((k) => !found.has(k.id)).map((k) => ({ id: k.id }));
  if (missing.length > 0) {
    log(`  refreshing ${missing.length} tracked cards outside the universe`);
    const { data } = await getCardCollection(missing);
    for (const c of data) found.set(c.id, c);
    report.refreshedKnown = data.length;
  }

  const upsertCard = db.prepare(UPSERT_CARD);
  const upsertPrice = db.prepare(UPSERT_PRICE);
  db.transaction(() => {
    for (const card of found.values()) {
      upsertCard.run(toRow(card, today));
      for (const [field, vendor, finish] of PRICE_FIELDS) {
        const raw = card.prices?.[field];
        const price = raw ? Number(raw) : NaN;
        if (Number.isFinite(price) && price > 0) {
          upsertPrice.run(card.id, today, vendor, finish, price);
          report.pricedRows++;
        }
      }
    }
  })();

  setMeta(db, "last_scryfall_sync", new Date().toISOString());
  const stats = rebuildStats(db);
  log(`  stats rebuilt: ${stats.cards} cards, ${stats.groups} sets`);
  return report;
}
