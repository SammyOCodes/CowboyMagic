import { ScryfallCard, ScryfallSearchResult, ScryfallError } from "@/types";
import { scryfallLimiter, scryfallSearchLimiter } from "@/lib/utils/rate-limiter";

const BASE_URL = "https://api.scryfall.com";
const HEADERS = {
  "User-Agent": "CowboyMagic/1.0",
  Accept: "application/json",
};

/**
 * How many times to wait out an HTTP 429 before giving up. Interactive callers
 * (the chatbot) fail fast at 0; batch jobs such as the price sync opt in.
 */
let rateLimitRetries = 0;

export function setRateLimitRetries(retries: number): void {
  rateLimitRetries = Math.max(0, retries);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** These endpoints are capped at 2 requests/second; the rest allow 10. */
const SLOW_ENDPOINTS = ["/cards/search", "/cards/named", "/cards/random", "/cards/collection"];

/** One throttled request. On 429, waits as Scryfall asks and retries. */
async function scryfallRequest(
  path: string,
  init: RequestInit = {}
): Promise<unknown> {
  const limiter = SLOW_ENDPOINTS.some((p) => path.startsWith(p))
    ? scryfallSearchLimiter
    : scryfallLimiter;
  for (let attempt = 0; ; attempt++) {
    const res = await limiter.throttle(() =>
      fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          ...HEADERS,
          ...(init.headers as Record<string, string> | undefined),
        },
      })
    );
    if (res.status === 429 && attempt < rateLimitRetries) {
      const header = Number(res.headers.get("retry-after"));
      const seconds = (Number.isFinite(header) && header > 0 ? header : 60) + 5;
      console.warn(
        `Scryfall rate limit hit; pausing ${seconds}s (retry ${attempt + 1}/${rateLimitRetries})`
      );
      await res.text().catch(() => undefined);
      await sleep(seconds * 1000);
      continue;
    }
    return res.json();
  }
}

async function scryfallFetch<T>(path: string): Promise<T> {
  const data = (await scryfallRequest(path)) as { object?: string };
  if (data.object === "error") {
    throw new ScryfallApiError(data as unknown as ScryfallError);
  }
  return data as T;
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
  order = "edhrec",
  extra: Record<string, string> = {}
): Promise<ScryfallSearchResult> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    order,
    ...extra,
  });
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

export type CardIdentifier = { name: string } | { id: string };

export async function getCardCollection<T extends CardIdentifier>(
  identifiers: T[]
): Promise<{ data: ScryfallCard[]; not_found: T[] }> {
  // Scryfall limits to 75 identifiers per request
  const batches: T[][] = [];
  for (let i = 0; i < identifiers.length; i += 75) {
    batches.push(identifiers.slice(i, i + 75));
  }

  const allCards: ScryfallCard[] = [];
  const allNotFound: T[] = [];

  for (const batch of batches) {
    const result = (await scryfallRequest("/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: batch }),
    })) as { object?: string; data?: ScryfallCard[]; not_found?: T[] };
    // An error is never an empty batch: surface it so callers stop instead of hammering on.
    if (result.object === "error") {
      throw new ScryfallApiError(result as unknown as ScryfallError);
    }
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
