import { openDb } from "../src/lib/chase/db";
import { planHistory, syncHistory } from "../src/lib/chase/sync-mtgjson";

const args = new Set(process.argv.slice(2));
const today = args.has("--today");
const planOnly = args.has("--plan");

const mb = (n: number) => `${(n / 1e6).toFixed(0)} MB`;

async function main() {
  const db = openDb();
  try {
    if (planOnly) {
      const plan = await planHistory(db, today);
      console.log(`History sync plan (${today ? "AllPricesToday" : "AllPrices, ~90 days"}):`);
      console.log(`  ${plan.setsToMap} MTGJSON set files to fetch for ID matching: ${mb(plan.setBytes)}`);
      if (plan.setsUnsized.length) {
        console.log(`  no MTGJSON file found for: ${plan.setsUnsized.join(", ")}`);
      }
      console.log(`  price file: ${mb(plan.pricesBytes)} (streamed, not saved to disk)`);
      console.log(`  total: ~${mb(plan.setBytes + plan.pricesBytes)}`);
      return;
    }
    const started = Date.now();
    console.log(`Syncing price history from MTGJSON (${today ? "today only" : "full 90 days"})...`);
    await syncHistory(db, { today });
    console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(0)}s.`);
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
