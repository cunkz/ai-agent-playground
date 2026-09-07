import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { embed } from "../embeddings/embeddings.js";
import { chunkText } from "./chunker.js";
import * as repository from "./repository.js";

const KNOWLEDGE_DIR = path.join(import.meta.dirname, "..", "..", "knowledge");

export async function ingestDocument(documentName: string, maxWordsPerChunk: number): Promise<number> {
  const filePath = path.join(KNOWLEDGE_DIR, documentName);

  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    throw new Error(`Document not found or unreadable: ${documentName}`);
  }

  const chunks = chunkText(content, maxWordsPerChunk);

  // Delete-then-insert rather than upsert: re-chunking with a different
  // maxWordsPerChunk changes how many chunks exist, so a partial upsert
  // could leave stale chunks from a larger previous chunk count behind.
  await repository.deleteChunksForDocument(documentName);

  for (const chunk of chunks) {
    const embedding = await embed(chunk.text);
    await repository.insertChunk({
      documentName,
      chunkIndex: chunk.index,
      content: chunk.text,
      embedding,
      metadata: { source: documentName },
    });
  }

  console.log(`[RAG] document=${documentName} chunks=${chunks.length}`);
  return chunks.length;
}

export async function ingestKnowledgeBase(maxWordsPerChunk: number): Promise<void> {
  const files = await readdir(KNOWLEDGE_DIR);
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    await ingestDocument(file, maxWordsPerChunk);
  }
}
