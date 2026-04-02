import { Deck, DeckCard } from "@/types";
import { getCardCollection } from "@/lib/scryfall/client";

interface ParsedEntry {
  quantity: number;
  name: string;
  board: DeckCard["board"];
}

export function parseDeckText(text: string): ParsedEntry[] {
  const lines = text.split("\n");
  const entries: ParsedEntry[] = [];
  let currentBoard: DeckCard["board"] = "mainboard";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    // Section headers
    const headerMatch = line.match(
      /^(COMMANDER|SIDEBOARD|MAYBEBOARD|COMPANION|MAINBOARD)\s*:?\s*$/i
    );
    if (headerMatch) {
      const header = headerMatch[1].toLowerCase();
      if (header === "commander") currentBoard = "commander";
      else if (header === "sideboard") currentBoard = "sideboard";
      else if (header === "maybeboard") currentBoard = "maybeboard";
      else if (header === "companion") currentBoard = "companion";
      else currentBoard = "mainboard";
      continue;
    }

    // Card line: "1 Sol Ring" or "1x Sol Ring"
    const cardMatch = line.match(/^(\d+)\s*x?\s+(.+?)(?:\s*\(.+\))?\s*$/);
    if (cardMatch) {
      entries.push({
        quantity: parseInt(cardMatch[1], 10),
        name: cardMatch[2].trim(),
        board: currentBoard,
      });
    }
  }

  return entries;
}

export async function importDeckFromText(
  text: string,
  deckName = "Imported Deck"
): Promise<Deck> {
  const entries = parseDeckText(text);

  if (entries.length === 0) {
    throw new Error("No cards found in the pasted text.");
  }

  const identifiers = entries.map((e) => ({ name: e.name }));
  const { data: cards, not_found } = await getCardCollection(identifiers);

  const cardMap = new Map(cards.map((c) => [c.name.toLowerCase(), c]));

  const deckCards: DeckCard[] = entries
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
    name: deckName,
    description: not_found.length > 0
      ? `${not_found.length} card(s) not found: ${not_found.map((c) => c.name).join(", ")}`
      : undefined,
    format: "commander",
    colors,
    cards: deckCards,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "text-import",
  };
}
