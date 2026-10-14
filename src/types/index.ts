// Scryfall types
export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  keywords: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  rarity: string;
  set: string;
  set_name: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  legalities: Record<string, string>;
  prices: Record<string, string | null>;
  scryfall_uri: string;
  rulings_uri: string;
  layout: string;
  // Printing metadata used by the chase-card tracker
  oracle_id?: string;
  released_at?: string;
  collector_number?: string;
  set_type?: string;
  border_color?: string;
  frame?: string;
  frame_effects?: string[];
  promo_types?: string[];
  finishes?: string[];
  full_art?: boolean;
  reserved?: boolean;
  digital?: boolean;
  tcgplayer_id?: number;
  tcgplayer_etched_id?: number;
  cardmarket_id?: number;
}

export interface ScryfallCardFace {
  name: string;
  mana_cost: string;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  image_uris?: ScryfallImageUris;
}

export interface ScryfallImageUris {
  small: string;
  normal: string;
  large: string;
  png: string;
  art_crop: string;
  border_crop: string;
}

export interface ScryfallSearchResult {
  object: "list";
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
}

export interface ScryfallError {
  object: "error";
  code: string;
  status: number;
  details: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: ScryfallCard[];
  scryfallQuery?: string;
  timestamp: number;
}
