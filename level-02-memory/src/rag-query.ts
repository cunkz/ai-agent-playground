import "dotenv/config";
import { connect, close } from "./database/client.js";
import { retrieveRelevantChunks } from "./rag/retrieval.js";
import { buildRagPrompt } from "./rag/context.js";
import { chatCompletion, LlmApiError } from "../../level-01-single-agent/src/llm.js";

async function main() {
  const question = process.argv.slice(2).join(" ") || "What database does this project use?";

  await connect();

  try {
    const chunks = await retrieveRelevantChunks({ queryText: question, topK: 3, minSimilarity: 0.3 });
    const { system, user } = buildRagPrompt(question, chunks);

    const response = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      [],
    );

    console.log("\n--- Question ---");
    console.log(question);
    console.log("\n--- Retrieved sources ---");
    if (chunks.length === 0) {
      console.log("  (none above similarity threshold)");
    } else {
      chunks.forEach((c) => console.log(`  [${c.similarity.toFixed(3)}] ${c.documentName} chunk ${c.chunkIndex}`));
    }
    console.log("\n--- Answer ---");
    console.log(response.choices[0].message.content);
  } finally {
    await close();
  }
}

main().catch((error) => {
  if (error instanceof LlmApiError) {
    console.error(`\nLLM API request failed (HTTP ${error.status}):`);
    console.error(JSON.stringify(error.body, null, 2));
  } else {
    console.error("\nunexpected failure:");
    console.error(error);
  }
  process.exit(1);
});
