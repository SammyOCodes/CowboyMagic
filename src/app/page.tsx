import Link from "next/link";
import { Sparkles, MessageCircle, TrendingUp, Lock } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto parchment-bg">
      {/* Hero */}
      <div className="text-center mb-12 pt-8">
        <Sparkles className="w-16 h-16 text-accent-gold mx-auto mb-4" />
        <h1 className="font-display text-5xl text-accent-gold mb-3">
          CowboyMagic
        </h1>
        <p className="text-text-secondary text-lg max-w-md mx-auto">
          Track chase card and Reserved List prices, and find the perfect cards
          with AI-powered search.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Link
          href="/chase"
          className="bg-bg-secondary border border-border rounded-xl p-6 hover:border-accent-gold/40 transition-all group"
        >
          <TrendingUp className="w-10 h-10 text-accent-orange mb-3 group-hover:text-accent-gold transition-colors" />
          <h2 className="font-display text-xl text-accent-gold mb-2">
            Chase Card Prices
          </h2>
          <p className="text-text-secondary text-sm">
            Track confetti foils, raised foils, serialized cards and every other
            premium treatment since 2016. Filter by set, treatment, price and
            momentum, and follow price history for single cards or whole sets.
          </p>
        </Link>

        <Link
          href="/reserved"
          className="bg-bg-secondary border border-border rounded-xl p-6 hover:border-accent-gold/40 transition-all group"
        >
          <Lock className="w-10 h-10 text-accent-orange mb-3 group-hover:text-accent-gold transition-colors" />
          <h2 className="font-display text-xl text-accent-gold mb-2">
            Reserved List
          </h2>
          <p className="text-text-secondary text-sm">
            Every printing of every card Wizards has promised never to reprint.
            Browse by set, type and price, and switch between Cardmarket,
            TCGplayer and Card Kingdom to follow vintage staples.
          </p>
        </Link>

        <Link
          href="/search"
          className="md:col-span-2 bg-bg-secondary border border-border rounded-xl p-6 hover:border-accent-gold/40 transition-all group"
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
      </div>
    </div>
  );
}
