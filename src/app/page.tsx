"use client";

import Link from "next/link";
import { Sparkles, MessageCircle, Library } from "lucide-react";
import { useEffect, useState } from "react";
import { getDecks } from "@/stores/deck-store";
import { Deck } from "@/types";

export default function Home() {
  const [decks, setDecks] = useState<Deck[]>([]);

  useEffect(() => {
    setDecks(getDecks());
  }, []);

  return (
    <div className="max-w-4xl mx-auto parchment-bg">
      {/* Hero */}
      <div className="text-center mb-12 pt-8">
        <Sparkles className="w-16 h-16 text-accent-gold mx-auto mb-4" />
        <h1 className="font-display text-5xl text-accent-gold mb-3">
          CowboyMagic
        </h1>
        <p className="text-text-secondary text-lg max-w-md mx-auto">
          Track your Commander decks and find the perfect cards with
          AI-powered search.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Link
          href="/search"
          className="bg-bg-secondary border border-border rounded-xl p-6 hover:border-accent-gold/40 transition-all group"
        >
          <MessageCircle className="w-10 h-10 text-accent-orange mb-3 group-hover:text-accent-gold transition-colors" />
          <h2 className="font-display text-xl text-accent-gold mb-2">
            Card Search
          </h2>
          <p className="text-text-secondary text-sm">
            Describe what you&apos;re looking for in plain English. Our AI
            converts your request into Scryfall queries and shows you matching
            cards with images.
          </p>
        </Link>

        <Link
          href="/decks"
          className="bg-bg-secondary border border-border rounded-xl p-6 hover:border-accent-gold/40 transition-all group"
        >
          <Library className="w-10 h-10 text-accent-orange mb-3 group-hover:text-accent-gold transition-colors" />
          <h2 className="font-display text-xl text-accent-gold mb-2">
            Deck Tracker
          </h2>
          <p className="text-text-secondary text-sm">
            Import your Commander decks from MoxField or paste a deck list.
            View your cards with stats, mana curves, and color breakdowns.
          </p>
        </Link>
      </div>

      {/* Quick stats */}
      {decks.length > 0 && (
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <h3 className="font-display text-lg text-accent-gold mb-4">
            Your Collection
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-accent-gold">
                {decks.length}
              </div>
              <div className="text-text-muted text-xs uppercase">Decks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent-gold">
                {decks.reduce((s, d) => s + d.cards.length, 0)}
              </div>
              <div className="text-text-muted text-xs uppercase">
                Unique Cards
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent-gold">
                {[...new Set(decks.flatMap((d) => d.colors))].length}
              </div>
              <div className="text-text-muted text-xs uppercase">Colors</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
