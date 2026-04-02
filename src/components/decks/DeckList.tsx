"use client";

import Link from "next/link";
import { Deck } from "@/types";
import { Trash2, ExternalLink } from "lucide-react";

const COLOR_MAP: Record<string, string> = {
  W: "bg-yellow-100 text-yellow-800",
  U: "bg-blue-400 text-blue-900",
  B: "bg-gray-700 text-gray-100",
  R: "bg-red-500 text-red-100",
  G: "bg-green-500 text-green-100",
};

interface DeckListProps {
  decks: Deck[];
  onDelete: (id: string) => void;
}

export default function DeckList({ decks, onDelete }: DeckListProps) {
  if (decks.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <p className="text-lg">No decks imported yet</p>
        <p className="text-sm mt-1">
          Import a deck from MoxField or paste a deck list above.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((deck) => (
        <div
          key={deck.id}
          className="bg-bg-surface border border-border rounded-xl p-4 hover:border-accent-gold/40 transition-colors group"
        >
          <div className="flex items-start justify-between mb-2">
            <Link
              href={`/decks/${deck.id}`}
              className="font-display text-accent-gold hover:text-accent-orange transition-colors text-lg"
            >
              {deck.name}
            </Link>
            <button
              onClick={() => onDelete(deck.id)}
              className="text-text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 mb-3">
            {deck.colors.map((c) => (
              <span
                key={c}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${COLOR_MAP[c] || "bg-gray-500 text-white"}`}
              >
                {c}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between text-text-muted text-xs">
            <span>{deck.cards.length} cards</span>
            <span className="capitalize">{deck.source}</span>
          </div>

          {deck.sourceUrl && (
            <a
              href={deck.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-accent-orange text-xs mt-2 hover:text-accent-orange-hover"
            >
              <ExternalLink className="w-3 h-3" />
              View on MoxField
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
