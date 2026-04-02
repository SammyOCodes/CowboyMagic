"use client";

import { useState, useEffect, useCallback } from "react";
import { Deck } from "@/types";
import { getDecks, deleteDeck } from "@/stores/deck-store";
import DeckImporter from "@/components/decks/DeckImporter";
import DeckList from "@/components/decks/DeckList";

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[]>([]);

  const refresh = useCallback(() => {
    setDecks(getDecks());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = (id: string) => {
    deleteDeck(id);
    refresh();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl text-accent-gold mb-1">
          My Decks
        </h1>
        <p className="text-text-secondary text-sm">
          Import and manage your Commander decks
        </p>
      </div>

      <DeckImporter onImported={refresh} />
      <DeckList decks={decks} onDelete={handleDelete} />
    </div>
  );
}
