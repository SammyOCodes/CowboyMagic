"use client";

import { useState } from "react";
import Image from "next/image";
import { ScryfallCard } from "@/types";
import { getCardImage, getCardBackImage } from "@/lib/scryfall/client";
import clsx from "clsx";

interface CardImageProps {
  card: ScryfallCard;
  size?: "small" | "normal" | "large";
  onClick?: () => void;
  className?: string;
}

const sizeMap = {
  small: { width: 146, height: 204 },
  normal: { width: 244, height: 340 },
  large: { width: 336, height: 468 },
};

export default function CardImage({
  card,
  size = "normal",
  onClick,
  className,
}: CardImageProps) {
  const [flipped, setFlipped] = useState(false);
  const frontUrl = getCardImage(card, size);
  const backUrl = getCardBackImage(card, size);
  const { width, height } = sizeMap[size];

  const currentUrl = flipped && backUrl ? backUrl : frontUrl;

  if (!frontUrl) {
    return (
      <div
        className={clsx(
          "bg-bg-surface rounded-lg flex items-center justify-center text-text-muted text-xs",
          className
        )}
        style={{ width, height }}
      >
        No image
      </div>
    );
  }

  return (
    <div className={clsx("relative group", className)}>
      <Image
        src={currentUrl}
        alt={card.name}
        width={width}
        height={height}
        className={clsx(
          "rounded-lg card-glow cursor-pointer",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
        unoptimized
      />
      {backUrl && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setFlipped(!flipped);
          }}
          className="absolute bottom-2 right-2 bg-bg-primary/80 text-text-primary text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Flip
        </button>
      )}
    </div>
  );
}
