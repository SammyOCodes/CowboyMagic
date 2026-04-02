"use client";

import { ChatMessage as ChatMessageType, ScryfallCard } from "@/types";
import CardGrid from "@/components/cards/CardGrid";
import { User, Sparkles } from "lucide-react";
import clsx from "clsx";

interface ChatMessageProps {
  message: ChatMessageType;
  onCardClick?: (card: ScryfallCard) => void;
}

export default function ChatMessage({ message, onCardClick }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={clsx("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-accent-orange" : "bg-accent-gold"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Sparkles className="w-4 h-4 text-bg-primary" />
        )}
      </div>

      <div
        className={clsx(
          "flex-1 max-w-[85%] space-y-3",
          isUser && "flex flex-col items-end"
        )}
      >
        <div
          className={clsx(
            "rounded-xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-accent-orange/20 text-text-primary"
              : "bg-bg-surface text-text-primary border border-border"
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {message.scryfallQuery && (
          <div className="text-xs text-text-muted bg-bg-primary/50 px-3 py-1.5 rounded-lg font-mono border border-border">
            Scryfall: {message.scryfallQuery}
          </div>
        )}

        {message.cards && message.cards.length > 0 && (
          <div className="w-full">
            <CardGrid
              cards={message.cards}
              size="small"
              onCardClick={onCardClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
