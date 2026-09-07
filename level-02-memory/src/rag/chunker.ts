export interface Chunk {
  index: number;
  text: string;
}

// Simplest possible chunking strategy: fixed-size, non-overlapping windows
// of whitespace-separated words. No sentence/paragraph awareness, no
// overlap between chunks — deliberately minimal so the effect of chunk
// size itself (not a clever splitting heuristic) is what the experiment
// observes.
export function chunkText(text: string, maxWordsPerChunk: number): Chunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: Chunk[] = [];

  for (let start = 0, index = 0; start < words.length; start += maxWordsPerChunk, index++) {
    chunks.push({ index, text: words.slice(start, start + maxWordsPerChunk).join(" ") });
  }

  return chunks;
}
