import "dotenv/config";

const apiKey = process.env.LLM_API_KEY;
const model = process.env.LLM_MODEL ?? "anthropic/claude-sonnet-4.5";
const baseUrl = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";

if (!apiKey) {
  console.error("Missing LLM_API_KEY. Set it in .env before running.");
  process.exit(1);
}

async function main() {
  const userPrompt = process.argv.slice(2).join(" ") || "Explain Redis Streams in exactly 3 bullet points.";

  console.log("--- Prompt ---");
  console.log(userPrompt);
  console.log("\n--- Streamed response (chunks arrive as they're generated) ---");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      stream: true,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    console.error(`--- API error (HTTP ${res.status}) ---`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  // The API sends Server-Sent Events: lines like `data: {...}` separated by blank lines,
  // terminated by a final `data: [DONE]`. We decode raw bytes and split on newlines ourselves.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice("data:".length).trim();
      if (payload === "[DONE]") continue;

      const chunk = JSON.parse(payload);
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) process.stdout.write(delta);
    }
  }

  console.log("\n");
}

main().catch((error) => {
  console.error("Request failed:");
  console.error(error);
  process.exit(1);
});
