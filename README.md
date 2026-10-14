# CowboyMagic

Price history for chase Magic cards and the Reserved List, built on Next.js and a local
SQLite database.

## Quick start

Requires **Node 22 or newer** (`nvm use` picks it up from `.nvmrc`).

```bash
npm install
npm run sync            # ~2 min: card universe, images, today's prices (Scryfall)
npm run sync:history    # ~5 min, ~270 MB one-time download: ~90 days of history (MTGJSON)
npm run dev             # http://localhost:3000
```

Everything is stored in `data/chase.db`. If someone already has a populated copy, drop it
in `data/` and skip the first two steps; run `npm run sync` afterwards to refresh.

**Card Search** (an Ollama-backed chatbot) is hidden by default. To enable it, run an
[Ollama](https://ollama.com) server with the model in `.env.example`, copy that file to
`.env.local`, and set `NEXT_PUBLIC_ENABLE_CARD_SEARCH=true`. The trackers don't need it.

## Price trackers

Two trackers share one database, one set of components and one sync:

| Tracker | Route | What it covers | Default market |
| --- | --- | --- | --- |
| Chase Cards | `/chase` | Premium treatments (confetti/raised/surge foils, serialized, ...) and high-value printings from 2016 on | TCGplayer ($) |
| Reserved List | `/reserved` | Every paper printing of every Reserved List card | Cardmarket (€) |

Each has the same three views:

- **Explorer**: filter by name, set, card type, rarity, color, finish, price range and
  price movement; sort by price or 7/30-day change; grid or table view. Filters live in
  the URL, so any view is shareable/bookmarkable. (Chase Cards also filters by treatment.)
- **Card page** (`/<tracker>/card/<id>`): price history, 90-day low/high, Card Kingdom
  retail/buylist reference, and every other tracked printing of the card.
- **Sets** (`/<tracker>/sets`): sets as baskets (chase: set × treatment, e.g. "Wilds of
  Eldraine: Enchanting Tales · Confetti Foil"; Reserved List: by set) with set value, top
  card, a per-set price index, and one combined index for the whole tracker.

### Markets

Every view is single-currency; switch markets with the tabs at the top:

- **TCGplayer ($)**: USD market price per finish.
- **Cardmarket (€)**: EUR. The Reserved List defaults to this because TCGplayer has no
  USD price for roughly a quarter of Reserved List printings, mostly the Alpha/Beta top end.
- **Card Kingdom ($)**: retail (and buylist as a reference column).

### Data

Data is stored locally in `data/chase.db` (SQLite, git-ignored).

```bash
npm run sync                  # Scryfall: card universe, images, today's prices (~2 min)
npm run sync:history          # MTGJSON: ~90-day price backfill (~150 MB download, streamed)
npm run sync:history -- --today   # MTGJSON: just today's prices (small)
npm run sync:history -- --plan    # show download sizes without fetching anything
```

Run `npm run sync` daily to keep growing your own history past MTGJSON's 90-day window.
Scryfall supplies TCGplayer and Cardmarket prices for the daily snapshot; MTGJSON supplies
the 90-day history for all three markets, including Card Kingdom retail/buylist.

The sync respects Scryfall's documented limits (search endpoints are 2 requests/second),
waits out any HTTP 429, and writes nothing if a query fails, so a partial run can't
corrupt your history.

### What gets tracked

Defined in [`src/lib/chase/config.ts`](src/lib/chase/config.ts):

1. Every paper printing with a premium promo treatment (small treatments in full; bulky
   ones like surge/ripple/halo foil only at or above a `minUsd` floor).
2. A price sweep: any paper printing from 2016+ at or above `$15` that is not on the
   Reserved List.
3. The Reserved List: every paper printing of every card on it, at any price.

Edit that file and re-run `npm run sync` to change the tracked universe. Cards that
drop out of the universe keep being refreshed, so their price history doesn't stop.

## Next.js

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
