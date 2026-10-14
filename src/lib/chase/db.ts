import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Db = Database.Database;

const DB_PATH =
  process.env.CHASE_DB_PATH || path.join(process.cwd(), "data", "chase.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  oracle_id TEXT,
  name TEXT NOT NULL,
  set_code TEXT NOT NULL,
  set_name TEXT NOT NULL,
  set_type TEXT,
  released_at TEXT,
  collector_number TEXT,
  rarity TEXT,
  mana_cost TEXT,
  type_line TEXT,
  colors TEXT NOT NULL DEFAULT 'C',
  border_color TEXT,
  frame_effects TEXT NOT NULL DEFAULT '[]',
  promo_types TEXT NOT NULL DEFAULT '[]',
  finishes TEXT NOT NULL DEFAULT '[]',
  treatments TEXT NOT NULL DEFAULT '[]',
  primary_treatment TEXT NOT NULL DEFAULT 'regular',
  primary_finish TEXT NOT NULL DEFAULT 'nonfoil',
  reserved INTEGER NOT NULL DEFAULT 0,   -- on the Reserved List (card-level flag)
  image_small TEXT,
  image_normal TEXT,
  image_large TEXT,
  image_art TEXT,
  scryfall_uri TEXT,
  tcgplayer_id INTEGER,
  mtgjson_uuid TEXT,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cards_set ON cards(set_code);
CREATE INDEX IF NOT EXISTS idx_cards_oracle ON cards(oracle_id);
CREATE INDEX IF NOT EXISTS idx_cards_group ON cards(set_code, primary_treatment);
CREATE INDEX IF NOT EXISTS idx_cards_reserved ON cards(reserved);

CREATE TABLE IF NOT EXISTS price_points (
  card_id TEXT NOT NULL,
  date TEXT NOT NULL,
  vendor TEXT NOT NULL,   -- tcgplayer (USD) | cardmarket (EUR) | cardkingdom (USD)
  kind TEXT NOT NULL,     -- retail | buylist
  finish TEXT NOT NULL,   -- nonfoil | foil | etched
  price REAL NOT NULL,
  source TEXT NOT NULL,   -- scryfall | mtgjson
  PRIMARY KEY (card_id, date, vendor, kind, finish)
) WITHOUT ROWID;

-- Derived tables (one row per card/set per market), rebuilt by rebuildStats().
CREATE TABLE IF NOT EXISTS card_stats (
  card_id TEXT NOT NULL,
  market TEXT NOT NULL,
  price_finish TEXT,
  price REAL,
  price_date TEXT,
  price_7d REAL,
  price_30d REAL,
  price_90d REAL,
  change_7d REAL,
  change_30d REAL,
  change_90d REAL,
  low REAL,
  high REAL,
  points INTEGER NOT NULL DEFAULT 0,
  first_date TEXT,
  ck_price REAL,
  ck_buylist REAL,
  PRIMARY KEY (card_id, market)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS idx_stats_price ON card_stats(market, price);

CREATE TABLE IF NOT EXISTS group_stats (
  group_key TEXT NOT NULL,      -- "<set_code>~<treatment>"; reserved cards use treatment "reserved"
  market TEXT NOT NULL,
  set_code TEXT NOT NULL,
  set_name TEXT NOT NULL,
  treatment TEXT NOT NULL,
  released_at TEXT,
  n_cards INTEGER NOT NULL,
  n_priced INTEGER NOT NULL,
  total REAL,
  avg REAL,
  max_price REAL,
  top_card_id TEXT,
  change_7d REAL,
  change_30d REAL,
  index_start TEXT,
  PRIMARY KEY (group_key, market)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS group_index (
  group_key TEXT NOT NULL,
  market TEXT NOT NULL,
  date TEXT NOT NULL,
  total REAL NOT NULL,
  PRIMARY KEY (group_key, market, date)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

declare global {
  var __chaseDb: Db | undefined;
}

function columns(db: Db, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
    (c) => c.name
  );
}

/** In-place upgrades for databases created by earlier versions. */
function migrate(db: Db): void {
  // Derived tables gained a `market` dimension. They are fully rebuildable from
  // price_points, so drop the old shapes and let rebuildStats() repopulate them.
  const stats = columns(db, "card_stats");
  if (stats.length > 0 && !stats.includes("market")) {
    db.exec("DROP TABLE card_stats; DROP TABLE group_stats; DROP TABLE group_index;");
    db.prepare("DELETE FROM meta WHERE key = 'stats_version'").run();
  }
  // Cards gained the Reserved List flag (filled in by the next Scryfall sync).
  const cards = columns(db, "cards");
  if (cards.length > 0 && !cards.includes("reserved")) {
    db.exec("ALTER TABLE cards ADD COLUMN reserved INTEGER NOT NULL DEFAULT 0");
  }
}

function open(): Db {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  // `meta` must exist before migrate() can touch it.
  db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  migrate(db);
  db.exec(SCHEMA);
  return db;
}

/** Shared connection (survives dev-server hot reloads). */
export function getDb(): Db {
  if (!globalThis.__chaseDb) globalThis.__chaseDb = open();
  return globalThis.__chaseDb;
}

/** Fresh connection for CLI scripts; caller closes it. */
export function openDb(): Db {
  return open();
}

export function getMeta(db: Db, key: string): string | null {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setMeta(db: Db, key: string, value: string): void {
  db.prepare(
    "INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}
