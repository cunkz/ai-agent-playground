import "dotenv/config";
import { executeToolCall, type ToolDefinition } from "./agent.js";
import { calculatorTool } from "./tools/calculator.js";
import { timeTool } from "./tools/time.js";
import type { ToolCallRequest } from "./llm.js";

const toolsByName = new Map<string, ToolDefinition<any>>([
  [calculatorTool.name, calculatorTool],
  [timeTool.name, timeTool],
]);

function fakeCall(name: string, args: unknown): ToolCallRequest {
  return { id: "test-call", type: "function", function: { name, arguments: JSON.stringify(args) } };
}

async function expect(label: string, call: ToolCallRequest, mustContain: string) {
  const result = await executeToolCall(call, toolsByName);
  const pass = result.includes(mustContain);
  console.log(`[${pass ? "PASS" : "FAIL"}] ${label}`);
  console.log(`        result: ${result}`);
  if (!pass) console.log(`        expected to contain: "${mustContain}"`);
}

async function main() {
  console.log("--- Test: unknown tool ---");
  await expect("unknown tool name", fakeCall("doesNotExist", {}), "unknown tool");

  console.log("\n--- Test 4: invalid calculator operation ---");
  await expect(
    "unsupported operation enum value",
    fakeCall("calculator", { operation: "power", a: 2, b: 10 }),
    "invalid arguments",
  );

  console.log("\n--- Test: missing required argument ---");
  await expect("missing 'b' argument", fakeCall("calculator", { operation: "add", a: 1 }), "invalid arguments");

  console.log("\n--- Test 5: division by zero ---");
  await expect("10 / 0", fakeCall("calculator", { operation: "divide", a: 10, b: 0 }), "Division by zero");

  console.log("\n--- Test: valid calculator call (control case) ---");
  await expect("125 * 37", fakeCall("calculator", { operation: "multiply", a: 125, b: 37 }), "4625");

  console.log("\n--- Test: malformed JSON arguments ---");
  const badJsonCall: ToolCallRequest = {
    id: "test-call",
    type: "function",
    function: { name: "calculator", arguments: "{not valid json" },
  };
  await expect("malformed JSON in tool_call.function.arguments", badJsonCall, "not valid JSON");
}

main();
