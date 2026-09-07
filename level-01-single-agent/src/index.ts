import "dotenv/config";
import { runAgent } from "./agent.js";
import { calculatorTool } from "./tools/calculator.js";
import { timeTool } from "./tools/time.js";
import { LlmApiError } from "./llm.js";

async function main() {
  const userPrompt = process.argv.slice(2).join(" ") || "What is an AI agent?";

  console.log("--- Task ---");
  console.log(userPrompt);
  console.log();

  const result = await runAgent(userPrompt, [calculatorTool, timeTool]);

  console.log("\n--- Final Answer ---");
  console.log(result.finalAnswer);
  console.log(`\n(stopped: ${result.stoppedReason}, iterations: ${result.iterations})`);
}

main().catch((error) => {
  if (error instanceof LlmApiError) {
    console.error(`\n[Agent] LLM API request failed (HTTP ${error.status}):`);
    console.error(JSON.stringify(error.body, null, 2));
  } else {
    console.error("\n[Agent] unexpected failure:");
    console.error(error);
  }
  process.exit(1);
});
