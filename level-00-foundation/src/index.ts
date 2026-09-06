import "dotenv/config";

const apiKey = process.env.LLM_API_KEY;
const model = process.env.LLM_MODEL ?? "anthropic/claude-sonnet-4.5";
const baseUrl = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";

if (!apiKey) {
  console.error("Missing LLM_API_KEY. Set it in .env before running.");
  process.exit(1);
}

async function main() {
  const userPrompt = process.argv.slice(2).join(" ") || "Explain Redis Streams.";

  const requestBody = {
    model,
    max_tokens: 1024,
    messages: [
      { role: "system", content: "You are a concise technical explainer for a backend engineer learning AI systems." },
      { role: "user", content: userPrompt },
    ],
  };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`--- API error (HTTP ${res.status}) ---`);
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("--- Prompt ---");
  console.log(userPrompt);
  console.log("\n--- Response ---");
  console.log(data.choices[0].message.content);
  console.log("\n--- Usage ---");
  console.log(`prompt tokens:     ${data.usage.prompt_tokens}`);
  console.log(`completion tokens: ${data.usage.completion_tokens}`);
  console.log(`finish reason:     ${data.choices[0].finish_reason}`);
}

main().catch((error) => {
  console.error("Request failed:");
  console.error(error);
  process.exit(1);
});
