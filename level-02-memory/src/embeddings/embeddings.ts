const apiKey = process.env.EMBEDDING_API_KEY;
const model = process.env.EMBEDDING_MODEL;
const url = process.env.EMBEDDING_BASE_URL;

// Deliberately a separate gateway/key/model from LLM_* — the chat-completion
// gateway (LLM_BASE_URL) only hosts a chat-mode model, confirmed not to
// support embeddings (see project memory / earlier troubleshooting).

export async function embed(text: string): Promise<number[]> {
  if (!apiKey || !model || !url) {
    throw new Error("Missing EMBEDDING_API_KEY / EMBEDDING_MODEL / EMBEDDING_BASE_URL in .env.");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Embedding API request failed (HTTP ${res.status}): ${JSON.stringify(data)}`);
  }

  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding API response did not contain a valid embedding array.");
  }

  return embedding;
}
