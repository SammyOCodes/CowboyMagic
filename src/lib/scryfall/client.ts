import { ScryfallCard, ScryfallSearchResult, ScryfallError } from "@/types";
import { scryfallLimiter } from "@/lib/utils/rate-limiter";

const BASE_URL = "https://api.scryfall.com";
const HEADERS = {
  "User-Agent": "CowboyMagic/1.0",
  Accept: "application/json",
};

async function scryfallFetch<T>(path: string): Promise<T> {
  return scryfallLimiter.throttle(async () => {
    const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS });
    const data = await res.json();
    if (data.object === "error") {
      throw new ScryfallApiError(data as ScryfallError);
    }
    return data as T;
  });
}

export class ScryfallApiError extends Error {
  code: string;
  status: number;
  details: string;

  constructor(err: ScryfallError) {
    super(err.details);
    this.code = err.code;
    this.status = err.status;
    this.details = err.details;
  }
}

export async function searchCards(
  query: string,
  page = 1,
  order = "edhrec"
): Promise<ScryfallSearchResult> {
  const params = new URLSearchParams({ q: query, page: String(page), order });
  return scryfallFetch<ScryfallSearchResult>(`/cards/search?${params}`);
}

export async function getCardByName(
  name: string,
  fuzzy = true
): Promise<ScryfallCard> {
  const params = new URLSearchParams(fuzzy ? { fuzzy: name } : { exact: name });
  return scryfallFetch<ScryfallCard>(`/cards/named?${params}`);
}

export async function getCardById(id: string): Promise<ScryfallCard> {
  return scryfallFetch<ScryfallCard>(`/cards/${id}`);
}

export async function getCardCollection(
  identifiers: { name: string }[]
): Promise<{ data: ScryfallCard[]; not_found: { name: string }[] }> {
  // Scryfall limits to 75 identifiers per request
  const batches: { name: string }[][] = [];
  for (let i = 0; i < identifiers.length; i += 75) {
    batches.push(identifiers.slice(i, i + 75));
  }

  const allCards: ScryfallCard[] = [];
  const allNotFound: { name: string }[] = [];

  for (const batch of batches) {
    const result = await scryfallLimiter.throttle(async () => {
      const res = await fetch(`${BASE_URL}/cards/collection`, {
        method: "POST",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: batch }),
      });
      return res.json();
    });
    allCards.push(...(result.data || []));
    allNotFound.push(...(result.not_found || []));
  }

  return { data: allCards, not_found: allNotFound };
}

export function getCardImage(
  card: ScryfallCard,
  size: keyof import("@/types").ScryfallImageUris = "normal"
): string {
  if (card.image_uris) return card.image_uris[size];
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris[size];
  return "";
}

export function getCardBackImage(
  card: ScryfallCard,
  size: keyof import("@/types").ScryfallImageUris = "normal"
): string | null {
  if (card.card_faces?.[1]?.image_uris) return card.card_faces[1].image_uris[size];
  return null;
}
