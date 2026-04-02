import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SCRYFALL_SYSTEM_PROMPT } from "@/lib/claude/system-prompt";
import { scryfallTools } from "@/lib/claude/tools";
import { searchCards, getCardByName, ScryfallApiError } from "@/lib/scryfall/client";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response(JSON.stringify({ error: "Invalid messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Convert chat messages to Anthropic format
  const anthropicMessages: Anthropic.MessageParam[] = messages.map(
    (msg: { role: string; content: string }) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })
  );

  try {
    // Initial Claude call with tools
    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SCRYFALL_SYSTEM_PROMPT,
      tools: scryfallTools,
      messages: anthropicMessages,
    });

    // Process tool calls in a loop
    const allContent: Anthropic.ContentBlock[] = [];
    let cardResults: unknown[] = [];
    let scryfallQuery = "";

    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );

      allContent.push(...textBlocks);

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        try {
          let result: unknown;

          if (toolUse.name === "search_scryfall") {
            const input = toolUse.input as { query: string; order?: string };
            scryfallQuery = input.query;
            const searchResult = await searchCards(
              input.query,
              1,
              input.order || "edhrec"
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
          } else if (toolUse.name === "fuzzy_search") {
            const input = toolUse.input as { name: string };
            const card = await getCardByName(input.name);
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

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          const errorMsg =
            err instanceof ScryfallApiError
              ? err.details
              : "Failed to execute search";
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: errorMsg }),
            is_error: true,
          });
        }
      }

      // Continue conversation with tool results
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SCRYFALL_SYSTEM_PROMPT,
        tools: scryfallTools,
        messages: [
          ...anthropicMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ],
      });
    }

    // Extract final text
    const finalText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const prefixText = allContent
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const fullText = [prefixText, finalText].filter(Boolean).join("\n");

    return new Response(
      JSON.stringify({
        content: fullText,
        cards: cardResults,
        scryfallQuery,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
