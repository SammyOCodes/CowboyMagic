/**
 * What counts as a "chase" card. Edit this file to change the tracked universe;
 * the next `npm run sync` picks it up.
 *
 * The universe is the union of:
 *   1. Every paper printing with a premium promo treatment (confetti foil,
 *      raised foil, ...). Small treatments are tracked in full; bulky ones carry
 *      a `minUsd` floor so hundreds of $0.50 foils don't drown out real chases.
 *   2. A price sweep: any paper printing from YEAR_FLOOR onward at or above
 *      PRICE_FLOOR_USD that isn't on the Reserved List.
 *   3. The Reserved List: every paper printing of every card on it, at any
 *      price (the tracker's own scope, shown under /reserved).
 */

export interface TreatmentDef {
  /** Scryfall promo_types value; also usable as `is:<key>` in Scryfall search. */
  key: string;
  label: string;
  /** Only track printings at/above this USD price. 0 = track the whole treatment. */
  minUsd: number;
}

/** Ordered by priority: the first match becomes a card's "primary" treatment. */
export const PROMO_TREATMENTS: TreatmentDef[] = [
  { key: "serialized", label: "Serialized", minUsd: 0 },
  { key: "confettifoil", label: "Confetti Foil", minUsd: 0 },
  { key: "oilslick", label: "Oil Slick Raised Foil", minUsd: 0 },
  { key: "raisedfoil", label: "Raised Foil", minUsd: 0 },
  { key: "textured", label: "Textured Foil", minUsd: 0 },
  { key: "stepandcompleat", label: "Step-and-Compleat Foil", minUsd: 0 },
  { key: "fracturefoil", label: "Fracture Foil", minUsd: 0 },
  { key: "doubleexposure", label: "Double Exposure", minUsd: 0 },
  { key: "invisibleink", label: "Invisible Ink", minUsd: 0 },
  { key: "neonink", label: "Neon Ink", minUsd: 0 },
  { key: "gilded", label: "Gilded Foil", minUsd: 0 },
  { key: "draculaseries", label: "Dracula Series", minUsd: 0 },
  { key: "doublerainbow", label: "Double Rainbow Foil", minUsd: 5 },
  { key: "galaxyfoil", label: "Galaxy Foil", minUsd: 5 },
  { key: "halofoil", label: "Halo Foil", minUsd: 5 },
  { key: "silverfoil", label: "Silver Foil", minUsd: 5 },
  { key: "ripplefoil", label: "Ripple Foil", minUsd: 5 },
  { key: "surgefoil", label: "Surge Foil", minUsd: 5 },
];

/** Printing-derived treatments (finish, frame, list membership), checked after promo types. */
export const FRAME_TREATMENTS: { key: string; label: string }[] = [
  { key: "reserved", label: "Reserved List" },
  { key: "etched", label: "Etched Foil" },
  { key: "borderless", label: "Borderless" },
  { key: "showcase", label: "Showcase" },
  { key: "extendedart", label: "Extended Art" },
  { key: "retro", label: "Retro Frame" },
  { key: "fullart", label: "Full Art" },
  { key: "regular", label: "Regular" },
];

export const PRICE_FLOOR_USD = 15;
export const YEAR_FLOOR = 2016;

export interface UniverseQuery {
  id: string;
  query: string;
}

export function universeQueries(): UniverseQuery[] {
  const queries: UniverseQuery[] = PROMO_TREATMENTS.map((t) => ({
    id: t.key,
    query: `is:${t.key} game:paper${t.minUsd > 0 ? ` usd>=${t.minUsd}` : ""}`,
  }));
  queries.push({
    id: "price-sweep",
    query: `game:paper year>=${YEAR_FLOOR} -is:reserved usd>=${PRICE_FLOOR_USD}`,
  });
  queries.push({ id: "reserved-list", query: "is:reserved game:paper" });
  return queries;
}

const LABELS = new Map<string, string>([
  ...PROMO_TREATMENTS.map((t) => [t.key, t.label] as [string, string]),
  ...FRAME_TREATMENTS.map((t) => [t.key, t.label] as [string, string]),
]);

export function treatmentLabel(key: string): string {
  return LABELS.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1);
}
