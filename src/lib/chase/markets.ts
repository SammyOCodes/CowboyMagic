/** Price markets we track. Each view is single-currency, so totals and charts stay consistent. */

export type Market = "tcgplayer" | "cardmarket" | "cardkingdom";
export type Currency = "USD" | "EUR";

export interface MarketInfo {
  key: Market;
  /** Full label, e.g. for chart captions. */
  label: string;
  /** Compact label for tabs and column headers. */
  short: string;
  currency: Currency;
  /** Value of price_points.vendor. */
  vendor: string;
}

export const MARKETS: MarketInfo[] = [
  { key: "tcgplayer", label: "TCGplayer market", short: "TCGplayer", currency: "USD", vendor: "tcgplayer" },
  { key: "cardmarket", label: "Cardmarket", short: "Cardmarket", currency: "EUR", vendor: "cardmarket" },
  { key: "cardkingdom", label: "Card Kingdom retail", short: "Card Kingdom", currency: "USD", vendor: "cardkingdom" },
];

const BY_KEY = new Map(MARKETS.map((m) => [m.key, m]));

export function isMarket(value: unknown): value is Market {
  return typeof value === "string" && BY_KEY.has(value as Market);
}

export function marketInfo(market: Market): MarketInfo {
  return BY_KEY.get(market)!;
}

export function currencyOf(market: Market): Currency {
  return marketInfo(market).currency;
}

export function currencySymbol(currency: Currency): string {
  return currency === "EUR" ? "€" : "$";
}
