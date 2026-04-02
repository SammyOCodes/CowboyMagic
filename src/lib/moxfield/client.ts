import { Deck, DeckCard } from "@/types";
import { getCardCollection } from "@/lib/scryfall/client";

const MOXFIELD_API = "https://api2.moxfield.com";
const HEADERS = {
  "User-Agent": "CowboyMagic/1.0",
  Accept: "application/json",
};

export function extractMoxfieldId(input: string): string {
  const match = input.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input;
}

interface MoxfieldDeckResponse {
  id: string;
  publicId: string;
  name: string;
  description: string;
  format: string;
  mainboard: Record<string, MoxfieldEntry>;
  sideboard: Record<string, MoxfieldEntry>;
  commanders: Record<string, MoxfieldEntry>;
  companions: Record<string, MoxfieldEntry>;
  maybeboard: Record<string, MoxfieldEntry>;
}

interface MoxfieldEntry {
  quantity: number;
  card: {
    name: string;
    scryfall_id?: string;
  };
}

export async function fetchMoxfieldDeck(publicId: string): Promise<MoxfieldDeckResponse> {
  const res = await fetch(`${MOXFIELD_API}/v2/decks/all/${publicId}`, {
    headers: HEADERS,
  });

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(
        "Blocked by Cloudflare protection. Try importing your deck as text instead."
      );
    }
    if (res.status === 404) {
      throw new Error("Deck not found. Make sure the deck is public and the URL is correct.");
    }
    throw new Error(`Failed to fetch deck: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function importMoxfieldDeck(urlOrId: string): Promise<Deck> {
  const publicId = extractMoxfieldId(urlOrId);
  const moxDeck = await fetchMoxfieldDeck(publicId);

  const allEntries: { name: string; quantity: number; board: DeckCard["board"] }[] = [];

  for (const [, entry] of Object.entries(moxDeck.commanders || {})) {
    allEntries.push({ name: entry.card.name, quantity: entry.quantity, board: "commander" });
  }
  for (const [, entry] of Object.entries(moxDeck.companions || {})) {
    allEntries.push({ name: entry.card.name, quantity: entry.quantity, board: "companion" });
  }
  for (const [, entry] of Object.entries(moxDeck.mainboard || {})) {
    allEntries.push({ name: entry.card.name, quantity: entry.quantity, board: "mainboard" });
  }
  for (const [, entry] of Object.entries(moxDeck.sideboard || {})) {
    allEntries.push({ name: entry.card.name, quantity: entry.quantity, board: "sideboard" });
  }
  for (const [, entry] of Object.entries(moxDeck.maybeboard || {})) {
    allEntries.push({ name: entry.card.name, quantity: entry.quantity, board: "maybeboard" });
  }

  const identifiers = allEntries.map((e) => ({ name: e.name }));
  const { data: cards } = await getCardCollection(identifiers);

  const cardMap = new Map(cards.map((c) => [c.name.toLowerCase(), c]));

  const deckCards: DeckCard[] = allEntries
    .map((entry) => {
      const card = cardMap.get(entry.name.toLowerCase());
      if (!card) return null;
      return { quantity: entry.quantity, card, board: entry.board };
    })
    .filter((c): c is DeckCard => c !== null);

  const colors = [
    ...new Set(deckCards.flatMap((dc) => dc.card.color_identity)),
  ];

  return {
    id: crypto.randomUUID(),
    name: moxDeck.name,
    description: moxDeck.description,
    format: moxDeck.format || "commander",
    colors,
    cards: deckCards,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "moxfield",
    sourceUrl: `https://www.moxfield.com/decks/${publicId}`,
  };
}
