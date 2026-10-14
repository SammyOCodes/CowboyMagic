import { createGunzip, gunzipSync } from "node:zlib";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { chain } from "stream-chain";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamObject } from "stream-json/streamers/StreamObject";
import { setMeta, type Db } from "./db";
import { rebuildStats } from "./stats";

const BASE = "https://mtgjson.com/api/v5";
const HEADERS = { "User-Agent": "CowboyMagic/1.0" };

type Log = (msg: string) => void;
type DateMap = Record<string, number>;
type FinishMap = Partial<Record<"normal" | "foil" | "etched", DateMap>>;
interface PriceEntry {
  paper?: {
    tcgplayer?: { retail?: FinishMap };
    cardmarket?: { retail?: FinishMap };
    cardkingdom?: { retail?: FinishMap; buylist?: FinishMap };
  };
}

/** MTGJSON names the non-foil finish "normal". */
const FINISH_MAP: [mtgjson: keyof FinishMap, ours: string][] = [
  ["normal", "nonfoil"],
  ["foil", "foil"],
  ["etched", "etched"],
];

const UPSERT_PRICE = `
INSERT INTO price_points (card_id, date, vendor, kind, finish, price, source)
VALUES (?, ?, ?, ?, ?, ?, 'mtgjson')
ON CONFLICT(card_id, date, vendor, kind, finish)
DO UPDATE SET price = excluded.price, source = 'mtgjson'
`;

// ---------- Step 1: scryfallId -> MTGJSON uuid, via per-set files ----------

function setsNeedingMapping(db: Db): string[] {
  return (
    db
      .prepare("SELECT DISTINCT set_code FROM cards WHERE mtgjson_uuid IS NULL ORDER BY set_code")
      .all() as { set_code: string }[]
  ).map((r) => r.set_code);
}

function setUrl(code: string): string {
  return `${BASE}/${code.toUpperCase()}.json.gz`;
}

export interface Plan {
  setsToMap: number;
  setBytes: number;
  setsUnsized: string[];
  pricesBytes: number;
}

/** HEAD-only: how much would a sync download? */
export async function planHistory(db: Db, today: boolean): Promise<Plan> {
  const sets = setsNeedingMapping(db);
  let setBytes = 0;
  const setsUnsized: string[] = [];
  for (let i = 0; i < sets.length; i += 8) {
    await Promise.all(
      sets.slice(i, i + 8).map(async (code) => {
        const res = await fetch(setUrl(code), { method: "HEAD", headers: HEADERS });
        const len = Number(res.headers.get("content-length"));
        if (res.ok && Number.isFinite(len)) setBytes += len;
        else setsUnsized.push(code);
      })
    );
  }
  const priceRes = await fetch(
    `${BASE}/${today ? "AllPricesToday" : "AllPrices"}.json.gz`,
    { method: "HEAD", headers: HEADERS }
  );
  return {
    setsToMap: sets.length,
    setBytes,
    setsUnsized,
    pricesBytes: Number(priceRes.headers.get("content-length")) || 0,
  };
}

async function fetchSetFile(code: string): Promise<{ cards: SetCard[] } | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(setUrl(code), { headers: HEADERS });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = JSON.parse(gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8"));
      return { cards: json.data?.cards ?? [] };
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

interface SetCard {
  uuid: string;
  side?: string;
  identifiers?: { scryfallId?: string };
}

export interface MapReport {
  mapped: number;
  stillUnmapped: number;
  missingSets: string[];
  failedSets: string[];
}

export async function mapUuids(db: Db, log: Log): Promise<MapReport> {
  const sets = setsNeedingMapping(db);
  const report: MapReport = { mapped: 0, stillUnmapped: 0, missingSets: [], failedSets: [] };
  const update = db.prepare("UPDATE cards SET mtgjson_uuid = ? WHERE id = ?");
  const wantedBySet = db.prepare("SELECT id FROM cards WHERE set_code = ? AND mtgjson_uuid IS NULL");

  let done = 0;
  const queue = [...sets];
  const worker = async () => {
    for (let code = queue.shift(); code !== undefined; code = queue.shift()) {
      try {
        const file = await fetchSetFile(code);
        if (!file) {
          report.missingSets.push(code);
        } else {
          // Double-faced cards appear once per face; prefer the front face.
          const uuidByScryfall = new Map<string, string>();
          for (const c of file.cards) {
            const sf = c.identifiers?.scryfallId;
            if (!sf) continue;
            if (!uuidByScryfall.has(sf) || !c.side || c.side === "a") uuidByScryfall.set(sf, c.uuid);
          }
          const ids = wantedBySet.all(code) as { id: string }[];
          db.transaction(() => {
            for (const { id } of ids) {
              const uuid = uuidByScryfall.get(id);
              if (uuid) {
                update.run(uuid, id);
                report.mapped++;
              } else {
                report.stillUnmapped++;
              }
            }
          })();
        }
      } catch (err) {
        report.failedSets.push(code);
        log(`    ${code}: ${err instanceof Error ? err.message : err}`);
      }
      done++;
      if (done % 20 === 0 || done === sets.length) log(`    mapped sets ${done}/${sets.length}`);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return report;
}

// ---------- Step 2: stream AllPrices / AllPricesToday into price_points ----------

export interface PriceReport {
  entriesScanned: number;
  cardsMatched: number;
  rows: number;
  newestDate: string | null;
}

export async function loadPrices(
  db: Db,
  opts: { today: boolean },
  log: Log
): Promise<PriceReport> {
  const url = `${BASE}/${opts.today ? "AllPricesToday" : "AllPrices"}.json.gz`;
  const wanted = new Map<string, string>(
    (
      db.prepare("SELECT mtgjson_uuid, id FROM cards WHERE mtgjson_uuid IS NOT NULL").all() as {
        mtgjson_uuid: string;
        id: string;
      }[]
    ).map((r) => [r.mtgjson_uuid, r.id])
  );
  log(`    tracking ${wanted.size} mapped cards; streaming ${url}`);

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok || !res.body) throw new Error(`Could not fetch ${url}: HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;

  const source = Readable.fromWeb(res.body as unknown as WebReadableStream<Uint8Array>);
  let received = 0;
  let lastLog = Date.now();
  source.on("data", (chunk: Buffer) => {
    received += chunk.length;
    if (Date.now() - lastLog > 5000) {
      lastLog = Date.now();
      const pct = total ? ` (${Math.round((received / total) * 100)}%)` : "";
      log(`    ${(received / 1e6).toFixed(0)}MB read${pct}, ${report.cardsMatched} cards matched`);
    }
  });

  const report: PriceReport = { entriesScanned: 0, cardsMatched: 0, rows: 0, newestDate: null };
  const insert = db.prepare(UPSERT_PRICE);
  const pipeline = chain([
    source,
    createGunzip(),
    parser(),
    pick({ filter: "data" }),
    streamObject(),
  ]);

  const BATCH = 400;
  let inBatch = 0;
  db.exec("BEGIN");
  try {
    for await (const { key, value } of pipeline as AsyncIterable<{
      key: string;
      value: PriceEntry;
    }>) {
      report.entriesScanned++;
      const cardId = wanted.get(key);
      if (!cardId) continue;
      const paper = value.paper;
      if (!paper) continue;
      report.cardsMatched++;

      const emit = (vendor: string, kind: string, map: FinishMap | undefined) => {
        if (!map) return;
        for (const [theirs, ours] of FINISH_MAP) {
          const dates = map[theirs];
          if (!dates) continue;
          for (const [date, price] of Object.entries(dates)) {
            if (!(price > 0)) continue;
            insert.run(cardId, date, vendor, kind, ours, price);
            report.rows++;
            if (!report.newestDate || date > report.newestDate) report.newestDate = date;
          }
        }
      };
      emit("tcgplayer", "retail", paper.tcgplayer?.retail);
      emit("cardmarket", "retail", paper.cardmarket?.retail);
      emit("cardkingdom", "retail", paper.cardkingdom?.retail);
      emit("cardkingdom", "buylist", paper.cardkingdom?.buylist);

      if (++inBatch >= BATCH) {
        db.exec("COMMIT; BEGIN");
        inBatch = 0;
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return report;
}

export async function syncHistory(
  db: Db,
  opts: { today: boolean },
  log: Log = console.log
): Promise<{ map: MapReport; prices: PriceReport }> {
  log("  step 1/3: matching cards to MTGJSON ids");
  const map = await mapUuids(db, log);
  log(
    `    ${map.mapped} newly mapped, ${map.stillUnmapped} not found in set files` +
      (map.missingSets.length ? `, no MTGJSON file for: ${map.missingSets.join(", ")}` : "")
  );
  log("  step 2/3: loading price history");
  const prices = await loadPrices(db, opts, log);
  log(`    ${prices.rows} price points for ${prices.cardsMatched} cards (newest ${prices.newestDate})`);
  log("  step 3/3: rebuilding stats");
  const stats = rebuildStats(db);
  log(`    ${stats.cards} cards, ${stats.groups} sets`);
  setMeta(db, "last_history_sync", new Date().toISOString());
  if (prices.newestDate) setMeta(db, "history_newest_date", prices.newestDate);
  return { map, prices };
}
