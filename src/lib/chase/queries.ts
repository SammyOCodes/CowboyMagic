import { getDb, getMeta, type Db } from "./db";
import { STATS_VERSION, rebuildStats } from "./stats";
import type { Filters, SortKey } from "./filters";
import { isMarket, marketInfo, type Market } from "./markets";
import type { Scope } from "./scope";

export const PAGE_SIZE = 48;
export const GROUP_PAGE_SIZE = 24;

/** Shared connection; derived tables are rebuilt on first use after an upgrade. */
function db(): Db {
  const d = getDb();
  if (getMeta(d, "stats_version") !== STATS_VERSION) {
    const n = (d.prepare("SELECT COUNT(*) AS n FROM cards").get() as { n: number }).n;
    if (n > 0) rebuildStats(d);
  }
  return d;
}

function assertMarket(market: Market): Market {
  if (!isMarket(market)) throw new Error(`Unknown market: ${String(market)}`);
  return market;
}

/** `market` is validated against a closed set, so inlining it is safe. */
function cardFrom(market: Market): string {
  return `FROM cards c LEFT JOIN card_stats s ON s.card_id = c.id AND s.market = '${assertMarket(market)}'`;
}

function scopeCond(scope: Scope): string {
  return `c.reserved = ${scope === "reserved" ? 1 : 0}`;
}

export interface ChaseCard {
  id: string;
  oracleId: string | null;
  name: string;
  setCode: string;
  setName: string;
  releasedAt: string | null;
  collectorNumber: string | null;
  rarity: string;
  manaCost: string | null;
  typeLine: string | null;
  colors: string;
  treatments: string[];
  primaryTreatment: string;
  primaryFinish: string;
  reserved: boolean;
  imageSmall: string | null;
  imageNormal: string | null;
  imageLarge: string | null;
  imageArt: string | null;
  scryfallUri: string | null;
  tcgplayerId: number | null;
  /** Market the stats below were computed for. */
  market: Market;
  // Stats (null when no price has been recorded in this market)
  price: number | null;
  priceFinish: string | null;
  priceDate: string | null;
  change7d: number | null;
  change30d: number | null;
  change90d: number | null;
  low: number | null;
  high: number | null;
  /** Card Kingdom USD reference prices. */
  ckPrice: number | null;
  ckBuylist: number | null;
  points: number;
  firstDate: string | null;
}

interface CardRow {
  id: string;
  oracle_id: string | null;
  name: string;
  set_code: string;
  set_name: string;
  released_at: string | null;
  collector_number: string | null;
  rarity: string;
  mana_cost: string | null;
  type_line: string | null;
  colors: string;
  treatments: string;
  primary_treatment: string;
  primary_finish: string;
  reserved: number;
  image_small: string | null;
  image_normal: string | null;
  image_large: string | null;
  image_art: string | null;
  scryfall_uri: string | null;
  tcgplayer_id: number | null;
  price: number | null;
  price_finish: string | null;
  price_date: string | null;
  change_7d: number | null;
  change_30d: number | null;
  change_90d: number | null;
  low: number | null;
  high: number | null;
  ck_price: number | null;
  ck_buylist: number | null;
  points: number | null;
  first_date: string | null;
}

const CARD_COLUMNS = `
  c.id, c.oracle_id, c.name, c.set_code, c.set_name, c.released_at, c.collector_number,
  c.rarity, c.mana_cost, c.type_line, c.colors, c.treatments, c.primary_treatment,
  c.primary_finish, c.reserved, c.image_small, c.image_normal, c.image_large, c.image_art,
  c.scryfall_uri, c.tcgplayer_id,
  s.price, s.price_finish, s.price_date, s.change_7d, s.change_30d, s.change_90d,
  s.low, s.high, s.ck_price, s.ck_buylist, s.points, s.first_date
`;

function toCard(r: CardRow, market: Market): ChaseCard {
  return {
    id: r.id,
    oracleId: r.oracle_id,
    name: r.name,
    setCode: r.set_code,
    setName: r.set_name,
    releasedAt: r.released_at,
    collectorNumber: r.collector_number,
    rarity: r.rarity,
    manaCost: r.mana_cost,
    typeLine: r.type_line,
    colors: r.colors,
    treatments: JSON.parse(r.treatments) as string[],
    primaryTreatment: r.primary_treatment,
    primaryFinish: r.primary_finish,
    reserved: r.reserved === 1,
    imageSmall: r.image_small,
    imageNormal: r.image_normal,
    imageLarge: r.image_large,
    imageArt: r.image_art,
    scryfallUri: r.scryfall_uri,
    tcgplayerId: r.tcgplayer_id,
    market,
    price: r.price,
    priceFinish: r.price_finish,
    priceDate: r.price_date,
    change7d: r.change_7d,
    change30d: r.change_30d,
    change90d: r.change_90d,
    low: r.low,
    high: r.high,
    ckPrice: r.ck_price,
    ckBuylist: r.ck_buylist,
    points: r.points ?? 0,
    firstDate: r.first_date,
  };
}

const SORT_COLUMNS: Record<SortKey, string> = {
  price: "s.price",
  change7d: "s.change_7d",
  change30d: "s.change_30d",
  released: "c.released_at",
  name: "c.name COLLATE NOCASE",
  set: "c.set_name COLLATE NOCASE",
};

function placeholders(n: number): string {
  return Array.from({ length: n }, () => "?").join(",");
}

function buildWhere(f: Filters, scope: Scope): { sql: string; params: (string | number)[] } {
  const where: string[] = [scopeCond(scope)];
  const params: (string | number)[] = [];

  if (!f.unpriced) where.push("s.price IS NOT NULL");
  if (f.q) {
    where.push("(c.name LIKE ? OR c.set_name LIKE ?)");
    params.push(`%${f.q}%`, `%${f.q}%`);
  }
  if (f.sets.length) {
    where.push(`c.set_code IN (${placeholders(f.sets.length)})`);
    params.push(...f.sets);
  }
  if (f.treatments.length) {
    where.push(
      `EXISTS (SELECT 1 FROM json_each(c.treatments) j WHERE j.value IN (${placeholders(f.treatments.length)}))`
    );
    params.push(...f.treatments);
  }
  if (f.rarities.length) {
    where.push(`c.rarity IN (${placeholders(f.rarities.length)})`);
    params.push(...f.rarities);
  }
  if (f.colors.length) {
    const parts = f.colors.map((c) => (c === "C" ? "c.colors = 'C'" : "c.colors LIKE ?"));
    where.push(`(${parts.join(" OR ")})`);
    for (const c of f.colors) if (c !== "C") params.push(`%${c}%`);
  }
  if (f.finishes.length) {
    where.push(`c.primary_finish IN (${placeholders(f.finishes.length)})`);
    params.push(...f.finishes);
  }
  if (f.types.length) {
    // CARD_TYPES is a closed set, so each entry is a plain word; match on the type line.
    where.push(`(${f.types.map(() => "c.type_line LIKE ?").join(" OR ")})`);
    params.push(...f.types.map((t) => `%${t}%`));
  }
  if (f.min !== null) {
    where.push("s.price >= ?");
    params.push(f.min);
  }
  if (f.max !== null) {
    where.push("s.price <= ?");
    params.push(f.max);
  }
  if (f.chg) {
    const col = f.win === "30d" ? "s.change_30d" : "s.change_7d";
    if (f.chg === "up") {
      where.push(`${col} > 0 AND ${col} >= ?`);
    } else {
      where.push(`${col} < 0 AND ${col} <= ?`);
    }
    params.push(f.chg === "up" ? f.chgMin : -f.chgMin);
  }
  return { sql: `WHERE ${where.join(" AND ")}`, params };
}

export interface CardPage {
  cards: ChaseCard[];
  total: number;
  totalValue: number;
  pages: number;
}

export function queryCards(f: Filters, scope: Scope): CardPage {
  const d = db();
  const from = cardFrom(f.market);
  const { sql, params } = buildWhere(f, scope);
  const agg = d
    .prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(s.price), 0) AS value ${from} ${sql}`)
    .get(...params) as { n: number; value: number };

  const col = SORT_COLUMNS[f.sort];
  const dir = f.dir === "asc" ? "ASC" : "DESC";
  const rows = d
    .prepare(
      `SELECT ${CARD_COLUMNS} ${from} ${sql}
       ORDER BY ${col} IS NULL, ${col} ${dir}, c.name COLLATE NOCASE ASC, c.id
       LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, (f.page - 1) * PAGE_SIZE) as CardRow[];

  return {
    cards: rows.map((r) => toCard(r, f.market)),
    total: agg.n,
    totalValue: agg.value,
    pages: Math.max(1, Math.ceil(agg.n / PAGE_SIZE)),
  };
}

export type SparkPoint = [date: string, price: number];

/** Recent retail series (in each card's representative finish), for sparklines. */
export function getSparklines(
  ids: string[],
  market: Market,
  days = 90
): Map<string, SparkPoint[]> {
  const out = new Map<string, SparkPoint[]>();
  if (ids.length === 0) return out;
  const rows = db()
    .prepare(
      `SELECT p.card_id, p.date, p.price
       FROM price_points p
       JOIN card_stats s ON s.card_id = p.card_id AND s.market = ? AND s.price_finish = p.finish
       WHERE p.vendor = ? AND p.kind = 'retail'
         AND p.card_id IN (${placeholders(ids.length)})
         AND p.date >= date(s.price_date, ?)
       ORDER BY p.card_id, p.date`
    )
    .all(market, marketInfo(market).vendor, ...ids, `-${days} days`) as {
    card_id: string;
    date: string;
    price: number;
  }[];
  for (const r of rows) {
    let arr = out.get(r.card_id);
    if (!arr) out.set(r.card_id, (arr = []));
    arr.push([r.date, r.price]);
  }
  return out;
}

export interface Facets {
  sets: { code: string; name: string; count: number }[];
  treatments: { key: string; count: number }[];
  rarities: string[];
}

export function getFacets(scope: Scope): Facets {
  const d = db();
  const where = scopeCond(scope);
  const sets = d
    .prepare(
      `SELECT c.set_code AS code, c.set_name AS name, COUNT(*) AS count
       FROM cards c WHERE ${where}
       GROUP BY c.set_code ORDER BY MAX(c.released_at) DESC, c.set_name`
    )
    .all() as { code: string; name: string; count: number }[];
  const treatments = d
    .prepare(
      `SELECT j.value AS key, COUNT(*) AS count
       FROM cards c, json_each(c.treatments) j
       WHERE ${where} AND j.value != 'reserved'
       GROUP BY j.value ORDER BY count DESC`
    )
    .all() as { key: string; count: number }[];
  const rarityOrder = ["mythic", "rare", "special", "bonus", "uncommon", "common"];
  const present = new Set(
    (
      d.prepare(`SELECT DISTINCT c.rarity FROM cards c WHERE ${where}`).all() as {
        rarity: string;
      }[]
    ).map((r) => r.rarity)
  );
  const rarities = [
    ...rarityOrder.filter((r) => present.has(r)),
    ...[...present].filter((r) => !rarityOrder.includes(r)),
  ];
  return { sets, treatments, rarities };
}

export interface Overview {
  cards: number;
  priced: number;
  sets: number;
  historyDays: number;
  oldestDate: string | null;
  newestDate: string | null;
  lastScryfallSync: string | null;
  lastHistorySync: string | null;
  /** True when the last Scryfall sync is missing or more than ~a day and a half old. */
  stale: boolean;
}

const STALE_AFTER_MS = 36 * 3_600_000;

export function getOverview(scope: Scope, market: Market): Overview {
  const d = db();
  const reserved = scope === "reserved" ? 1 : 0;
  const counts = d
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM cards WHERE reserved = @reserved) AS cards,
         (SELECT COUNT(*) FROM card_stats s JOIN cards c ON c.id = s.card_id
            WHERE s.market = @market AND s.price IS NOT NULL AND c.reserved = @reserved) AS priced,
         (SELECT COUNT(DISTINCT g.group_key) FROM group_stats g
            WHERE g.market = @market AND g.n_priced > 0
              AND (g.treatment = 'reserved') = @reserved) AS sets`
    )
    .get({ reserved, market }) as { cards: number; priced: number; sets: number };
  const span = d
    .prepare(
      `SELECT COUNT(DISTINCT date) AS days, MIN(date) AS oldest, MAX(date) AS newest
       FROM price_points WHERE vendor = ? AND kind = 'retail'`
    )
    .get(marketInfo(market).vendor) as {
    days: number;
    oldest: string | null;
    newest: string | null;
  };
  const lastScryfallSync = getMeta(d, "last_scryfall_sync");
  return {
    ...counts,
    historyDays: span.days,
    oldestDate: span.oldest,
    newestDate: span.newest,
    lastScryfallSync,
    lastHistorySync: getMeta(d, "last_history_sync"),
    stale:
      !lastScryfallSync ||
      Date.now() - new Date(lastScryfallSync).getTime() > STALE_AFTER_MS,
  };
}

// ---------- single card ----------

export function getCard(id: string, market: Market): ChaseCard | null {
  const row = db()
    .prepare(`SELECT ${CARD_COLUMNS} ${cardFrom(market)} WHERE c.id = ?`)
    .get(id) as CardRow | undefined;
  return row ? toCard(row, market) : null;
}

export interface SeriesRow {
  date: string;
  tcgplayer: number | null;
  cardmarket: number | null;
  cardkingdom: number | null;
  buylist: number | null;
}

/** Every vendor's series for the card's representative finish, merged by date. */
export function getSeries(card: ChaseCard): SeriesRow[] {
  const finish = card.priceFinish ?? card.primaryFinish;
  const rows = db()
    .prepare(
      `SELECT date, vendor, kind, price FROM price_points
       WHERE card_id = ? AND finish = ? ORDER BY date`
    )
    .all(card.id, finish) as { date: string; vendor: string; kind: string; price: number }[];
  const byDate = new Map<string, SeriesRow>();
  for (const r of rows) {
    let row = byDate.get(r.date);
    if (!row) {
      row = { date: r.date, tcgplayer: null, cardmarket: null, cardkingdom: null, buylist: null };
      byDate.set(r.date, row);
    }
    if (r.vendor === "tcgplayer" && r.kind === "retail") row.tcgplayer = r.price;
    else if (r.vendor === "cardmarket" && r.kind === "retail") row.cardmarket = r.price;
    else if (r.vendor === "cardkingdom" && r.kind === "retail") row.cardkingdom = r.price;
    else if (r.vendor === "cardkingdom" && r.kind === "buylist") row.buylist = r.price;
  }
  return [...byDate.values()];
}

/** Latest price per finish in the given market. */
export function getFinishPrices(
  id: string,
  market: Market
): { finish: string; price: number; date: string }[] {
  return db()
    .prepare(
      `SELECT p.finish, p.price, p.date FROM price_points p
       WHERE p.card_id = ? AND p.vendor = ? AND p.kind = 'retail'
         AND p.date = (SELECT MAX(date) FROM price_points
                       WHERE card_id = p.card_id AND vendor = p.vendor
                         AND kind = p.kind AND finish = p.finish)
       ORDER BY p.price DESC`
    )
    .all(id, marketInfo(market).vendor) as { finish: string; price: number; date: string }[];
}

export function getOtherPrintings(card: ChaseCard, market: Market, limit = 12): ChaseCard[] {
  if (!card.oracleId) return [];
  const rows = db()
    .prepare(
      `SELECT ${CARD_COLUMNS} ${cardFrom(market)}
       WHERE c.oracle_id = ? AND c.id != ?
       ORDER BY s.price IS NULL, s.price DESC LIMIT ?`
    )
    .all(card.oracleId, card.id, limit) as CardRow[];
  return rows.map((r) => toCard(r, market));
}

// ---------- sets (set × treatment groups) ----------

export interface ChaseGroup {
  key: string;
  market: Market;
  setCode: string;
  setName: string;
  treatment: string;
  releasedAt: string | null;
  nCards: number;
  nPriced: number;
  total: number | null;
  avg: number | null;
  maxPrice: number | null;
  change7d: number | null;
  change30d: number | null;
  indexStart: string | null;
  topCardId: string | null;
  topCardName: string | null;
  topCardArt: string | null;
  topCardImage: string | null;
}

interface GroupRow {
  group_key: string;
  set_code: string;
  set_name: string;
  treatment: string;
  released_at: string | null;
  n_cards: number;
  n_priced: number;
  total: number | null;
  avg: number | null;
  max_price: number | null;
  change_7d: number | null;
  change_30d: number | null;
  index_start: string | null;
  top_card_id: string | null;
  top_name: string | null;
  top_art: string | null;
  top_image: string | null;
}

const GROUP_SELECT = `
  SELECT g.group_key, g.set_code, g.set_name, g.treatment, g.released_at, g.n_cards, g.n_priced,
         g.total, g.avg, g.max_price, g.change_7d, g.change_30d, g.index_start, g.top_card_id,
         t.name AS top_name, t.image_art AS top_art, t.image_normal AS top_image
  FROM group_stats g LEFT JOIN cards t ON t.id = g.top_card_id`;

function toGroup(r: GroupRow, market: Market): ChaseGroup {
  return {
    key: r.group_key,
    market,
    setCode: r.set_code,
    setName: r.set_name,
    treatment: r.treatment,
    releasedAt: r.released_at,
    nCards: r.n_cards,
    nPriced: r.n_priced,
    total: r.total,
    avg: r.avg,
    maxPrice: r.max_price,
    change7d: r.change_7d,
    change30d: r.change_30d,
    indexStart: r.index_start,
    topCardId: r.top_card_id,
    topCardName: r.top_name,
    topCardArt: r.top_art,
    topCardImage: r.top_image,
  };
}

export type GroupSort = "total" | "avg" | "max" | "change7d" | "change30d" | "released" | "cards";

export interface GroupFilters {
  q: string;
  market: Market;
  treatment: string;
  minCards: number;
  minTotal: number | null;
  sort: GroupSort;
  dir: "asc" | "desc";
  page: number;
}

const GROUP_SORT: Record<GroupSort, string> = {
  total: "g.total",
  avg: "g.avg",
  max: "g.max_price",
  change7d: "g.change_7d",
  change30d: "g.change_30d",
  released: "g.released_at",
  cards: "g.n_priced",
};

function groupScopeCond(scope: Scope): string {
  return scope === "reserved" ? "g.treatment = 'reserved'" : "g.treatment != 'reserved'";
}

export function queryGroups(
  f: GroupFilters,
  scope: Scope
): { groups: ChaseGroup[]; total: number; pages: number } {
  const d = db();
  const where: string[] = [`g.market = '${assertMarket(f.market)}'`, "g.n_priced > 0", groupScopeCond(scope)];
  const params: (string | number)[] = [];
  if (f.q) {
    where.push("(g.set_name LIKE ? OR g.set_code LIKE ?)");
    params.push(`%${f.q}%`, `%${f.q}%`);
  }
  if (f.treatment) {
    where.push("g.treatment = ?");
    params.push(f.treatment);
  }
  if (f.minCards > 1) {
    where.push("g.n_priced >= ?");
    params.push(f.minCards);
  }
  if (f.minTotal !== null) {
    where.push("g.total >= ?");
    params.push(f.minTotal);
  }
  const sql = `WHERE ${where.join(" AND ")}`;
  const total = (
    d.prepare(`SELECT COUNT(*) AS n FROM group_stats g ${sql}`).get(...params) as { n: number }
  ).n;
  const col = GROUP_SORT[f.sort];
  const rows = d
    .prepare(
      `${GROUP_SELECT} ${sql}
       ORDER BY ${col} IS NULL, ${col} ${f.dir === "asc" ? "ASC" : "DESC"}, g.set_name
       LIMIT ? OFFSET ?`
    )
    .all(...params, GROUP_PAGE_SIZE, (f.page - 1) * GROUP_PAGE_SIZE) as GroupRow[];
  return {
    groups: rows.map((r) => toGroup(r, f.market)),
    total,
    pages: Math.max(1, Math.ceil(total / GROUP_PAGE_SIZE)),
  };
}

export function getGroup(key: string, market: Market): ChaseGroup | null {
  const row = db()
    .prepare(`${GROUP_SELECT} WHERE g.group_key = ? AND g.market = ?`)
    .get(key, assertMarket(market)) as GroupRow | undefined;
  return row ? toGroup(row, market) : null;
}

export function getGroupIndexes(keys: string[], market: Market): Map<string, SparkPoint[]> {
  const out = new Map<string, SparkPoint[]>();
  if (keys.length === 0) return out;
  const rows = db()
    .prepare(
      `SELECT group_key, date, total FROM group_index
       WHERE market = ? AND group_key IN (${placeholders(keys.length)})
       ORDER BY group_key, date`
    )
    .all(assertMarket(market), ...keys) as { group_key: string; date: string; total: number }[];
  for (const r of rows) {
    let arr = out.get(r.group_key);
    if (!arr) out.set(r.group_key, (arr = []));
    arr.push([r.date, r.total]);
  }
  return out;
}

export function getGroupCards(
  key: string,
  market: Market,
  sort: SortKey,
  dir: "asc" | "desc"
): ChaseCard[] {
  const [setCode, treatment] = key.split("~");
  const col = SORT_COLUMNS[sort];
  const rows = db()
    .prepare(
      `SELECT ${CARD_COLUMNS} ${cardFrom(market)}
       WHERE c.set_code = ? AND c.primary_treatment = ?
       ORDER BY ${col} IS NULL, ${col} ${dir === "asc" ? "ASC" : "DESC"}, c.name COLLATE NOCASE`
    )
    .all(setCode, treatment) as CardRow[];
  return rows.map((r) => toCard(r, market));
}

export function getTreatmentFacets(
  scope: Scope,
  market: Market
): { key: string; count: number }[] {
  return db()
    .prepare(
      `SELECT g.treatment AS key, COUNT(*) AS count FROM group_stats g
       WHERE g.market = ? AND g.n_priced > 0 AND ${groupScopeCond(scope)}
       GROUP BY g.treatment ORDER BY count DESC`
    )
    .all(assertMarket(market)) as { key: string; count: number }[];
}

/**
 * Everything in a scope as one line: the sum of its set indexes. Only sets whose
 * index already existed at the common start date are included, so composition
 * stays constant across the whole series.
 */
export function getScopeIndex(scope: Scope, market: Market): SparkPoint[] {
  const d = db();
  const starts = d
    .prepare(
      `SELECT g.index_start AS s FROM group_stats g
       WHERE g.market = ? AND g.index_start IS NOT NULL AND ${groupScopeCond(scope)}
       ORDER BY g.index_start`
    )
    .all(assertMarket(market)) as { s: string }[];
  if (starts.length === 0) return [];
  const threshold = starts[Math.min(starts.length - 1, Math.ceil(starts.length * 0.9) - 1)].s;
  const rows = d
    .prepare(
      `SELECT gi.date AS date, SUM(gi.total) AS total
       FROM group_index gi
       JOIN group_stats g ON g.group_key = gi.group_key AND g.market = gi.market
       WHERE gi.market = ? AND gi.date >= ? AND g.index_start <= ? AND ${groupScopeCond(scope)}
       GROUP BY gi.date ORDER BY gi.date`
    )
    .all(market, threshold, threshold) as { date: string; total: number }[];
  return rows.map((r) => [r.date, r.total] as SparkPoint);
}
