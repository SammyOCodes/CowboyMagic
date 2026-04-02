"use client";

import { ScryfallCard } from "@/types";
import CardImage from "./CardImage";
import { X } from "lucide-react";

interface CardDetailProps {
  card: ScryfallCard;
  onClose: () => void;
}

function ManaSymbols({ cost }: { cost: string }) {
  return <span className="text-accent-gold font-mono">{cost}</span>;
}

export default function CardDetail({ card, onClose }: CardDetailProps) {
  const oracleText = card.oracle_text || card.card_faces?.[0]?.oracle_text || "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-display text-xl text-accent-gold">{card.name}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          <div className="shrink-0">
            <CardImage card={card} size="large" />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <span className="text-text-muted text-xs uppercase tracking-wide">
                Type
              </span>
              <p className="text-text-primary">{card.type_line}</p>
            </div>

            {card.mana_cost && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  Mana Cost
                </span>
                <p>
                  <ManaSymbols cost={card.mana_cost} /> ({card.cmc} MV)
                </p>
              </div>
            )}

            {oracleText && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  Oracle Text
                </span>
                <p className="text-text-primary whitespace-pre-line text-sm">
                  {oracleText}
                </p>
              </div>
            )}

            {(card.power || card.toughness) && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  P/T
                </span>
                <p className="text-text-primary">
                  {card.power}/{card.toughness}
                </p>
              </div>
            )}

            {card.loyalty && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  Loyalty
                </span>
                <p className="text-text-primary">{card.loyalty}</p>
              </div>
            )}

            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  Rarity
                </span>
                <p className="text-text-primary capitalize">{card.rarity}</p>
              </div>
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  Set
                </span>
                <p className="text-text-primary">{card.set_name}</p>
              </div>
            </div>

            {card.keywords.length > 0 && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  Keywords
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {card.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="bg-bg-surface text-text-secondary text-xs px-2 py-0.5 rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {card.prices?.usd && (
              <div>
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  Price
                </span>
                <p className="text-accent-gold">${card.prices.usd}</p>
              </div>
            )}

            <a
              href={card.scryfall_uri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-accent-orange hover:text-accent-orange-hover text-sm underline mt-2"
            >
              View on Scryfall
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
