import type { ScryfallCard } from "@/types";
import { PROMO_TREATMENTS } from "./config";

export type Finish = "nonfoil" | "foil" | "etched";

export const FINISHES: Finish[] = ["nonfoil", "foil", "etched"];

export interface Classification {
  /** Every treatment tag that applies, e.g. ["raisedfoil", "showcase"]. */
  treatments: string[];
  /** The single tag used to group printings into "chase sets". */
  primaryTreatment: string;
  /** The finish whose price represents this printing. */
  primaryFinish: Finish;
}

function normalizeFinishes(card: ScryfallCard): Finish[] {
  const out = (card.finishes ?? []).filter((f): f is Finish =>
    FINISHES.includes(f as Finish)
  );
  return out.length > 0 ? out : ["nonfoil"];
}

export function classify(card: ScryfallCard): Classification {
  const promo = new Set(card.promo_types ?? []);
  const effects = new Set(card.frame_effects ?? []);
  const finishes = normalizeFinishes(card);

  const tags: string[] = PROMO_TREATMENTS.filter((t) => promo.has(t.key)).map(
    (t) => t.key
  );
  const hasPromoFoil = tags.length > 0;

  // Reserved List printings are grouped by set under the "reserved" pseudo-treatment,
  // which keeps them from mixing with chase baskets in the same set.
  if (card.reserved) tags.unshift("reserved");
  if (finishes.includes("etched")) tags.push("etched");
  if (card.border_color === "borderless") tags.push("borderless");
  if (effects.has("showcase")) tags.push("showcase");
  if (effects.has("extendedart")) tags.push("extendedart");
  // "Retro frame" is a modern-set treatment; Reserved List cards were simply printed in that frame.
  if (!card.reserved && (card.frame === "1997" || card.frame === "1993")) tags.push("retro");
  if (card.full_art) tags.push("fullart");
  if (tags.length === 0) tags.push("regular");

  let primaryFinish: Finish;
  if (finishes.length === 1) {
    primaryFinish = finishes[0];
  } else if (hasPromoFoil && finishes.includes("foil")) {
    primaryFinish = "foil";
  } else if (finishes.includes("nonfoil")) {
    primaryFinish = "nonfoil";
  } else {
    primaryFinish = finishes.includes("foil") ? "foil" : finishes[0];
  }

  return { treatments: tags, primaryTreatment: tags[0], primaryFinish };
}

export function colorString(card: ScryfallCard): string {
  const colors =
    card.colors ??
    card.card_faces?.flatMap((f) => (f as { colors?: string[] }).colors ?? []) ??
    [];
  const unique = [...new Set(colors)];
  return unique.length > 0 ? unique.join("") : "C";
}
