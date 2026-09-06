import "dotenv/config";

const apiKey = process.env.LLM_API_KEY;
const model = process.env.LLM_MODEL ?? "anthropic/claude-sonnet-4.5";
const baseUrl = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";

if (!apiKey) {
  console.error("Missing LLM_API_KEY. Set it in .env before running.");
  process.exit(1);
}

async function main() {
  const topic = process.argv.slice(2).join(" ") || "Redis Streams";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content:
            "You reply with ONLY valid JSON, no markdown fences, no commentary. " +
            'The JSON must match this shape: { "topic": string, "summary": string, "difficulty": "beginner" | "intermediate" | "advanced" }',
        },
        { role: "user", content: `Explain: ${topic}` },
      ],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`--- API error (HTTP ${res.status}) ---`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  const raw = data.choices[0].message.content;

  console.log("--- Raw model output ---");
  console.log(raw);

  try {
    const parsed = JSON.parse(raw);
    console.log("\n--- Parsed JSON ---");
    console.log(parsed);
  } catch (err) {
    console.log("\n--- JSON.parse failed ---");
    console.log("The model did not return valid JSON. This is why structured output needs validation (see Level 1 / Zod).");
  }
}

main().catch((error) => {
  console.error("Request failed:");
  console.error(error);
  process.exit(1);
});
