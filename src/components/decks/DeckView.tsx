"use client";

import { useState } from "react";
import { Deck, DeckCard, ScryfallCard } from "@/types";
import CardGrid from "@/components/cards/CardGrid";
import CardDetail from "@/components/cards/CardDetail";
import DeckStats from "./DeckStats";
import clsx from "clsx";

const BOARDS: { key: DeckCard["board"]; label: string }[] = [
  { key: "commander", label: "Commander" },
  { key: "mainboard", label: "Mainboard" },
  { key: "sideboard", label: "Sideboard" },
  { key: "companion", label: "Companion" },
  { key: "maybeboard", label: "Maybeboard" },
];

interface DeckViewProps {
  deck: Deck;
}

export default function DeckView({ deck }: DeckViewProps) {
  const [activeBoard, setActiveBoard] = useState<DeckCard["board"] | "stats">(
    "commander"
  );
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);

  const boardsWithCards = BOARDS.filter((b) =>
    deck.cards.some((c) => c.board === b.key)
  );

  const currentCards =
    activeBoard === "stats"
      ? []
      : deck.cards
          .filter((c) => c.board === activeBoard)
          .flatMap((dc) => Array(dc.quantity).fill(dc.card));

  return (
    <div>
      {/* Board tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {boardsWithCards.map((b) => {
          const count = deck.cards
            .filter((c) => c.board === b.key)
            .reduce((sum, c) => sum + c.quantity, 0);
          return (
            <button
              key={b.key}
              onClick={() => setActiveBoard(b.key)}
              className={clsx(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                activeBoard === b.key
                  ? "bg-accent-orange text-white"
                  : "bg-bg-surface text-text-secondary hover:text-text-primary border border-border"
              )}
            >
              {b.label} ({count})
            </button>
          );
        })}
        <button
          onClick={() => setActiveBoard("stats")}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeBoard === "stats"
              ? "bg-accent-orange text-white"
              : "bg-bg-surface text-text-secondary hover:text-text-primary border border-border"
          )}
        >
          Stats
        </button>
      </div>

      {activeBoard === "stats" ? (
        <DeckStats deck={deck} />
      ) : (
        <CardGrid cards={currentCards} onCardClick={setSelectedCard} />
      )}

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
