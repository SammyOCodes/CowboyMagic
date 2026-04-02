"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { ScryfallCard } from "@/types";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
import CardDetail from "@/components/cards/CardDetail";
import { Sparkles, Trash2 } from "lucide-react";

const SUGGESTED_QUERIES = [
  "Show me board wipes under 4 mana",
  "Find green ramp spells for commander",
  "Legendary creatures in Gruul colors",
  "Equipment that gives indestructible",
  "Blue counterspells under 3 mana",
  "Lands that produce any color of mana",
];

export default function ChatPanel() {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl text-accent-gold">
            Card Search
          </h2>
          <p className="text-text-secondary text-sm">
            Describe the cards you want in plain English
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-text-muted hover:text-text-primary transition-colors p-2"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-12 h-12 text-accent-gold/40 mb-4" />
            <h3 className="font-display text-lg text-text-secondary mb-2">
              Ask me about Magic cards
            </h3>
            <p className="text-text-muted text-sm mb-6 max-w-md">
              I&apos;ll convert your descriptions into Scryfall queries and find
              the perfect cards for your deck.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
              {SUGGESTED_QUERIES.map((query) => (
                <button
                  key={query}
                  onClick={() => sendMessage(query)}
                  className="text-left text-sm px-3 py-2 rounded-lg border border-border hover:border-accent-gold/40 hover:bg-bg-surface text-text-secondary hover:text-text-primary transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onCardClick={setSelectedCard}
            />
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-gold flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-bg-primary" />
            </div>
            <div className="bg-bg-surface border border-border rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-accent-gold/60 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-accent-gold/60 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-accent-gold/60 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
