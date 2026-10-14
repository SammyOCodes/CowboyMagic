/**
 * Feature flags. Next inlines NEXT_PUBLIC_* values, so these work in client
 * components (the nav) as well as on the server. Set them in `.env.local`.
 */

/**
 * Card Search: the Ollama-backed chatbot (/search, /api/chat) and its Scryfall
 * proxy (/api/scryfall/search). Hidden unless NEXT_PUBLIC_ENABLE_CARD_SEARCH=true,
 * since it needs a local Ollama server that most setups won't have.
 */
export const CARD_SEARCH_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_CARD_SEARCH === "true";
