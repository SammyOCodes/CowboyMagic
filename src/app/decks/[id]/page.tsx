"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Deck } from "@/types";
import { getDeckById } from "@/stores/deck-store";
import DeckView from "@/components/decks/DeckView";
import { ArrowLeft } from "lucide-react";

export default function DeckDetailPage() {
  const params = useParams();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    const found = getDeckById(id);
    if (found) {
      setDeck(found);
    } else {
      setNotFound(true);
    }
  }, [params.id]);

  if (notFound) {
    return (
      <div className="max-w-5xl mx-auto text-center py-12">
        <p className="text-text-muted text-lg mb-4">Deck not found</p>
        <Link
          href="/decks"
          className="text-accent-orange hover:text-accent-orange-hover"
        >
          Back to decks
        </Link>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="max-w-5xl mx-auto text-center py-12">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/decks"
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-3xl text-accent-gold">
            {deck.name}
          </h1>
          {deck.description && (
            <p className="text-text-secondary text-sm mt-1">
              {deck.description}
            </p>
          )}
          <div className="flex gap-1 mt-2">
            {deck.colors.map((c) => (
              <span
                key={c}
                className="text-xs bg-bg-surface px-2 py-0.5 rounded text-text-secondary"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <DeckView deck={deck} />
    </div>
  );
}
