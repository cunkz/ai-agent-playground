import type { SimilarChunk } from "./repository.js";

export function buildContext(chunks: SimilarChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map((c) => `[Source: ${c.documentName}, chunk ${c.chunkIndex}]\n${c.content}`)
    .join("\n\n---\n\n");
}

export const RAG_SYSTEM_PROMPT =
  "You answer questions using ONLY the provided context below. If the context does not " +
  'contain enough information to answer, say "I don\'t have enough information in the ' +
  'knowledge base to answer that" rather than guessing or using outside knowledge. When ' +
  "you do answer, cite the source document(s) you used.";

export function buildRagPrompt(question: string, chunks: SimilarChunk[]): { system: string; user: string } {
  const context = buildContext(chunks);
  const user = context
    ? `Context:\n${context}\n\nQuestion: ${question}`
    : `Context: (no relevant documents found)\n\nQuestion: ${question}`;
  return { system: RAG_SYSTEM_PROMPT, user };
}
