import "dotenv/config";
import { connect, close } from "../database/client.js";
import { ingestKnowledgeBase } from "./ingestion.js";

async function main() {
  const maxWordsPerChunk = Number(process.argv[2] ?? 150);
  await connect();
  await ingestKnowledgeBase(maxWordsPerChunk);
  await close();
}

main().catch((err) => {
  console.error("ingestion failed:", err);
  process.exit(1);
});
