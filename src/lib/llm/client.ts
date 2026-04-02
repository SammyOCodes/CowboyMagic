import { scryfallTools, OllamaToolFunction } from "./tools";
import { SCRYFALL_SYSTEM_PROMPT } from "./system-prompt";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
    tool_calls?: ToolCall[];
  };
  done: boolean;
}

export async function chatCompletion(
  messages: ChatMessage[],
  tools?: OllamaToolFunction[]
): Promise<OllamaChatResponse> {
  const res = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      tools: tools || scryfallTools,
      stream: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Ollama request failed (${res.status}): ${text}. Is Ollama running? Start it with: ollama serve`
    );
  }

  const data = await res.json();

  // OpenAI-compatible format returns choices array
  if (data.choices) {
    return {
      message: data.choices[0].message,
      done: true,
    };
  }

  // Native Ollama format
  return data;
}

export function buildMessages(
  userMessages: { role: string; content: string }[]
): ChatMessage[] {
  return [
    { role: "system", content: SCRYFALL_SYSTEM_PROMPT },
    ...userMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];
}

export function hasToolCalls(
  message: OllamaChatResponse["message"]
): boolean {
  return (message.tool_calls?.length ?? 0) > 0;
}
