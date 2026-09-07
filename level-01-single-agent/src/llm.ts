const apiKey = process.env.LLM_API_KEY;
const model = process.env.LLM_MODEL ?? "anthropic/claude-sonnet-4.5";
const baseUrl = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";

if (!apiKey) {
  throw new Error("Missing LLM_API_KEY. Set it in .env before running.");
}

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCallRequest[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolCallRequest {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ChatCompletionResponse {
  choices: Array<{
    finish_reason: string;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCallRequest[];
    };
  }>;
  usage: { prompt_tokens: number; completion_tokens: number };
}

export class LlmApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`LLM API request failed with HTTP ${status}`);
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  tools: ToolSpec[],
): Promise<ChatCompletionResponse> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: 1024, messages, tools }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new LlmApiError(res.status, data);
  }

  return data as ChatCompletionResponse;
}
