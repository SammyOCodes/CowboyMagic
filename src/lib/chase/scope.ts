/** The two trackers share one database and one set of components; scope picks the slice. */

import type { Market } from "./markets";

export type Scope = "chase" | "reserved";

export interface ScopeInfo {
  key: Scope;
  basePath: string;
  title: string;
  subtitle: string;
  setsTitle: string;
  setsSubtitle: string;
  defaultMarket: Market;
}

export const SCOPES: Record<Scope, ScopeInfo> = {
  chase: {
    key: "chase",
    basePath: "/chase",
    title: "Chase Cards",
    subtitle: "Premium treatments and high-value printings since 2016, with price history.",
    setsTitle: "Chase Sets",
    setsSubtitle:
      "Every set × treatment combination, valued as a basket of its cards. Open one to see its cards and a price index for the whole set.",
    defaultMarket: "tcgplayer",
  },
  reserved: {
    key: "reserved",
    basePath: "/reserved",
    title: "Reserved List",
    subtitle:
      "Every printing of every card on the Reserved List, the cards Wizards has promised never to reprint.",
    setsTitle: "Reserved List Sets",
    setsSubtitle:
      "Reserved List printings grouped by set, valued as a basket. Open one to see its cards and a price index for the whole set.",
    // Cardmarket prices the vintage top end (Alpha/Beta) that TCGplayer often can't.
    defaultMarket: "cardmarket",
  },
};

export function scopeFromPath(pathname: string): Scope {
  return pathname.startsWith("/reserved") ? "reserved" : "chase";
}

export function cardHref(card: { id: string; reserved: boolean }): string {
  return `${SCOPES[card.reserved ? "reserved" : "chase"].basePath}/card/${card.id}`;
}

/**
 * The treatment badge worth showing for a card. Reserved List cards all share the
 * "reserved" pseudo-treatment, so only a real treatment (e.g. foil) is shown for them.
 */
export function displayTreatment(card: {
  reserved: boolean;
  treatments: string[];
  primaryTreatment: string;
}): string | null {
  if (!card.reserved) return card.primaryTreatment;
  return card.treatments.find((t) => t !== "reserved" && t !== "regular") ?? null;
}

/** Reserved List groups are keyed `<set>~reserved`; chase groups `<set>~<treatment>`. */
export function scopeOfGroup(group: { treatment: string }): Scope {
  return group.treatment === "reserved" ? "reserved" : "chase";
}

export function groupHref(group: { key: string; treatment: string }): string {
  return `${SCOPES[scopeOfGroup(group)].basePath}/sets/${encodeURIComponent(group.key)}`;
}
