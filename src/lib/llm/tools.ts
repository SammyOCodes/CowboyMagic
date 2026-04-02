export interface OllamaToolFunction {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export const scryfallTools: OllamaToolFunction[] = [
  {
    type: "function",
    function: {
      name: "search_scryfall",
      description:
        "Search for Magic: The Gathering cards using Scryfall syntax. Returns card data including names, types, costs, and image URLs. Use this for general card searches based on attributes like color, type, mana cost, keywords, etc.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The Scryfall search query string using proper syntax (e.g., 'f:commander t:creature id<=rug pow>=5 order:edhrec')",
          },
          order: {
            type: "string",
            description:
              "Sort order for results. Defaults to 'edhrec'. Options: name, cmc, power, toughness, set, rarity, color, usd, edhrec, penny, released",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fuzzy_search",
      description:
        "Look up a specific Magic card by name. Handles misspellings and partial names. Use this when the user asks about a specific card by name rather than searching for cards with certain attributes.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "The card name to look up (can be fuzzy/approximate)",
          },
        },
        required: ["name"],
      },
    },
  },
];
