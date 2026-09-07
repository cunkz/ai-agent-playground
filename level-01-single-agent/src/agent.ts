import type { z } from "zod";
import { chatCompletion, type ChatMessage, type ToolCallRequest, type ToolSpec } from "./llm.js";

export interface ToolDefinition<T = unknown> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  schema: z.ZodType<T>;
  execute: (args: T) => string | Promise<string>;
}

export interface AgentResult {
  finalAnswer: string;
  messages: ChatMessage[];
  iterations: number;
  stoppedReason: "final_answer" | "max_iterations";
}

const MAX_ITERATIONS = Number(process.env.MAX_ITERATIONS ?? 10);

export async function runAgent(userPrompt: string, tools: ToolDefinition<any>[]): Promise<AgentResult> {
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  const toolSpecs: ToolSpec[] = tools.map((tool) => ({
    type: "function",
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  }));

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: "You are a helpful assistant. Use tools when they help answer accurately; otherwise answer directly.",
    },
    { role: "user", content: userPrompt },
  ];

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    console.log(`[Agent] iteration=${iteration}`);

    const response = await chatCompletion(messages, toolSpecs);
    const assistantMessage = response.choices[0].message;

    messages.push({
      role: "assistant",
      content: assistantMessage.content,
      tool_calls: assistantMessage.tool_calls,
    });

    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      console.log("[Agent] final response");
      return {
        finalAnswer: assistantMessage.content ?? "",
        messages,
        iterations: iteration,
        stoppedReason: "final_answer",
      };
    }

    for (const call of assistantMessage.tool_calls) {
      const result = await executeToolCall(call, toolsByName);
      messages.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  console.log(`[Agent] max iterations (${MAX_ITERATIONS}) reached`);
  return {
    finalAnswer: `Stopped: reached the maximum of ${MAX_ITERATIONS} iterations without a final answer.`,
    messages,
    iterations: MAX_ITERATIONS,
    stoppedReason: "max_iterations",
  };
}

export async function executeToolCall(
  call: ToolCallRequest,
  toolsByName: Map<string, ToolDefinition<any>>,
): Promise<string> {
  const tool = toolsByName.get(call.function.name);

  if (!tool) {
    console.log(`[Agent] unknown tool requested: ${call.function.name}`);
    return `Error: unknown tool "${call.function.name}".`;
  }

  console.log(`[Agent] model requested tool=${tool.name}`);

  let rawArgs: unknown;
  try {
    rawArgs = JSON.parse(call.function.arguments);
  } catch {
    console.log(`[Agent] arguments for ${tool.name} were not valid JSON`);
    return `Error: arguments for "${tool.name}" were not valid JSON.`;
  }

  console.log(`[Agent] validating arguments for ${tool.name}`);
  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    console.log(`[Agent] validation failed for ${tool.name}`);
    return `Error: invalid arguments for "${tool.name}": ${parsed.error.message}`;
  }

  console.log(`[Agent] executing ${tool.name}`);
  try {
    const result = await tool.execute(parsed.data);
    console.log(`[Agent] tool result=${result}`);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.log(`[Agent] tool execution failed for ${tool.name}: ${message}`);
    return `Error: tool "${tool.name}" failed: ${message}`;
  }
}
