import { openDb } from "../src/lib/chase/db";
import { syncScryfall } from "../src/lib/chase/sync-scryfall";

async function main() {
  const db = openDb();
  const started = Date.now();
  console.log("Syncing chase cards from Scryfall...");
  try {
    const report = await syncScryfall(db);
    const total = (db.prepare("SELECT COUNT(*) AS n FROM cards").get() as { n: number }).n;
    console.log(
      `\nDone in ${((Date.now() - started) / 1000).toFixed(0)}s: ` +
        `${report.discovered} cards from queries, ${report.refreshedKnown} refreshed, ` +
        `${report.pricedRows} price points stored for ${report.date}. ${total} cards tracked.`
    );
    const failed = report.perQuery.filter((q) => q.error);
    if (failed.length > 0) {
      console.log(`\n${failed.length} queries were skipped:`);
      for (const q of failed) console.log(`  ${q.id}: ${q.error}`);
    }
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
