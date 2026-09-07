import "dotenv/config";
import { runAgent } from "../../level-01-single-agent/src/agent.js";
import { LlmApiError } from "../../level-01-single-agent/src/llm.js";
import { calculatorTool } from "../../level-01-single-agent/src/tools/calculator.js";
import { timeTool } from "../../level-01-single-agent/src/tools/time.js";
import { rememberTool } from "./tools/remember.js";
import { recallTool } from "./tools/recall.js";
import { recallSimilarTool } from "./tools/recall-similar.js";
import { connect, close } from "./database/client.js";

async function main() {
  const userPrompt = process.argv.slice(2).join(" ") || "What do you remember about me?";

  await connect();

  try {
    console.log("--- Task ---");
    console.log(userPrompt);
    console.log();

    const result = await runAgent(userPrompt, [
      calculatorTool,
      timeTool,
      rememberTool,
      recallTool,
      recallSimilarTool,
    ]);

    console.log("\n--- Final Answer ---");
    console.log(result.finalAnswer);
    console.log(`\n(stopped: ${result.stoppedReason}, iterations: ${result.iterations})`);
  } finally {
    await close();
  }
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
