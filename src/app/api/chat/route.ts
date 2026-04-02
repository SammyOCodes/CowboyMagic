import { NextRequest } from "next/server";
import {
  chatCompletion,
  buildMessages,
  hasToolCalls,
  ChatMessage,
} from "@/lib/llm/client";
import {
  searchCards,
  getCardByName,
  ScryfallApiError,
} from "@/lib/scryfall/client";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Invalid messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const llmMessages = buildMessages(messages);
    let response = await chatCompletion(llmMessages);

    let cardResults: unknown[] = [];
    let scryfallQuery = "";
    const conversationMessages: ChatMessage[] = [...llmMessages];

    // Tool use loop — keep calling until the model stops requesting tools
    let iterations = 0;
    while (hasToolCalls(response.message) && iterations < 5) {
      iterations++;

      // Add assistant message with tool calls
      conversationMessages.push({
        role: "assistant",
        content: response.message.content || "",
        tool_calls: response.message.tool_calls,
      });

      // Execute each tool call
      for (const toolCall of response.message.tool_calls!) {
        const args = JSON.parse(toolCall.function.arguments);

        try {
          let result: unknown;

          if (toolCall.function.name === "search_scryfall") {
            scryfallQuery = args.query;
            const searchResult = await searchCards(
              args.query,
              1,
              args.order || "edhrec"
            );
            cardResults = searchResult.data;
            result = {
              total_cards: searchResult.total_cards,
              cards: searchResult.data.slice(0, 20).map((c) => ({
                name: c.name,
                mana_cost: c.mana_cost,
                type_line: c.type_line,
                oracle_text: c.oracle_text?.slice(0, 100),
                power: c.power,
                toughness: c.toughness,
                rarity: c.rarity,
                cmc: c.cmc,
              })),
            };
          } else if (toolCall.function.name === "fuzzy_search") {
            const card = await getCardByName(args.name);
            cardResults = [card];
            result = {
              name: card.name,
              mana_cost: card.mana_cost,
              type_line: card.type_line,
              oracle_text: card.oracle_text,
              power: card.power,
              toughness: card.toughness,
              rarity: card.rarity,
              cmc: card.cmc,
              prices: card.prices,
            };
          }

          conversationMessages.push({
            role: "tool",
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          });
        } catch (err) {
          const errorMsg =
            err instanceof ScryfallApiError
              ? err.details
              : "Failed to execute search";
          conversationMessages.push({
            role: "tool",
            content: JSON.stringify({ error: errorMsg }),
            tool_call_id: toolCall.id,
          });
        }
      }

      // Get next response from the model
      response = await chatCompletion(conversationMessages);
    }

    return new Response(
      JSON.stringify({
        content: response.message.content || "",
        cards: cardResults,
        scryfallQuery,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Chat API error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
