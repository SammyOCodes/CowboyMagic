"use client";

import { ScryfallCard } from "@/types";
import CardImage from "./CardImage";

interface CardGridProps {
  cards: ScryfallCard[];
  onCardClick?: (card: ScryfallCard) => void;
  size?: "small" | "normal";
}

export default function CardGrid({
  cards,
  onCardClick,
  size = "normal",
}: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <p className="text-lg">No cards to display</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div key={card.id} className="flex flex-col items-center gap-1">
          <CardImage
            card={card}
            size={size}
            onClick={() => onCardClick?.(card)}
          />
          <span className="text-xs text-text-secondary text-center truncate w-full">
            {card.name}
          </span>
        </div>
      ))}
    </div>
  );
}
