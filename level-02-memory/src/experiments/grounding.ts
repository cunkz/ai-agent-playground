import "dotenv/config";
import { connect, close } from "../database/client.js";
import { retrieveRelevantChunks } from "../rag/retrieval.js";
import { buildRagPrompt } from "../rag/context.js";
import { chatCompletion } from "../../../level-01-single-agent/src/llm.js";

const QUESTIONS = [
  // Answerable: directly covered in database.md.
  "What Docker image does this project use for Postgres, and why that one specifically?",
  // Deliberately NOT covered by any of the four knowledge docs.
  "What is the project's target customer demographic?",
];

async function ask(question: string, minSimilarity = 0.3) {
  console.log(`\n\n=== Question: ${question} (minSimilarity=${minSimilarity}) ===`);
  const chunks = await retrieveRelevantChunks({ queryText: question, topK: 3, minSimilarity });
  console.log(`Retrieved ${chunks.length} chunk(s) above threshold`);
  chunks.forEach((c) => console.log(`  [${c.similarity.toFixed(3)}] ${c.documentName} #${c.chunkIndex}`));

  const { system, user } = buildRagPrompt(question, chunks);
  const response = await chatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    [],
  );
  console.log(`\nAnswer: ${response.choices[0].message.content}`);
}

async function main() {
  await connect();
  await ask(QUESTIONS[0]);
  await ask(QUESTIONS[1], 0.3);
  await ask(QUESTIONS[1], 0.5); // stricter threshold — excludes the weakly-related chunks
  await close();
}

main().catch((err) => {
  console.error("grounding test failed:", err);
  process.exit(1);
});
