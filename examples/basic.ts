/**
 * Run with: CANARY_AI_API_KEY=clk_live_... bun run examples/basic.ts
 */
import CanaryCodersAI, { RateLimitError } from "@canarycoders/ai";

const client = new CanaryCodersAI();

// 1. A completion (submit + poll handled for you)
const res = await client.chat.complete({
  provider: "openai",
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Give me one fact about canaries." }],
});
console.log(res.content);
console.log("tokens:", res.usage.totalTokens);

// 2. Streaming
process.stdout.write("\nstreaming: ");
for await (const event of client.chat.stream({
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  messages: [{ role: "user", content: "Count to five." }],
})) {
  if (event.type === "text") process.stdout.write(event.delta);
}
process.stdout.write("\n");

// 3. Hold the job handle instead of awaiting inline
const job = await client.images.generateJob({
  provider: "openai",
  prompt: "a small yellow canary on a branch, studio light",
});
console.log("queued image:", job.id);
const image = await job.result();
console.log("got", image.images.length, "image(s)");

// 4. Typed errors
try {
  await client.chat.complete({
    provider: "openai",
    messages: [{ role: "user", content: "hi" }],
  });
} catch (err) {
  if (err instanceof RateLimitError) {
    console.warn("rate limited, retry after", err.retryAfterMs, "ms");
  }
}
