# @canarycoders/ai

TypeScript SDK for the [CanaryCoders AI](https://ai.canarycoders.es) gateway. Runs on Node 18+ and Bun, with no runtime dependencies.

**Docs:** https://docs.ai.canarycoders.es

One client covers chat, image/video/audio generation, embeddings, vision, conversational agents, realtime sessions, and usage data. The queue polling, SSE streaming, retries, and error typing are handled for you, so most calls are a single `await`.

## Install

```bash
bun add @canarycoders/ai
# or: npm install @canarycoders/ai
```

## Quick start

```ts
import CanaryLLM from "@canarycoders/ai";

const client = new CanaryLLM({ apiKey: process.env.CANARY_AI_API_KEY });

const res = await client.chat.complete({
  provider: "openai",
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }],
});

console.log(res.content, res.usage.totalTokens);
```

`apiKey` defaults to `CANARY_AI_API_KEY` (legacy `CANARYLLM_API_KEY` still works) and `baseURL` to the hosted gateway, so `new CanaryLLM()` with the env var set is enough.

## How the queue works

The gateway runs most work through a queue: a request returns a `queueId`, and you poll for the result. The SDK does that for you. `chat.complete`, `images.generate`, `audio.speech`, and the rest submit the job and poll until it finishes, then resolve the typed result.

When you want the handle instead of waiting inline, every queued method has a `*Job` (or `submit`) sibling:

```ts
const job = await client.chat.submit({ provider: "openai", messages });
console.log(job.id);          // queueId, e.g. to track out of band
const result = await job.result();
```

Cancelling the await also cancels the job on the server:

```ts
const ctrl = new AbortController();
const pending = client.video.generate({ provider: "gemini", prompt }, { signal: ctrl.signal });
ctrl.abort();                 // stops polling and fires queue/cancel
```

Poll timing is tunable per call (`initialIntervalMs`, `maxIntervalMs`, `maxWaitMs`) or once on the client via the `poll` option. The default wait budget per operation matches the gateway's own timeouts.

## Streaming

```ts
for await (const event of client.chat.stream({
  provider: "anthropic",
  model: "claude-sonnet-4-5",
  messages: [{ role: "user", content: "Write a haiku" }],
})) {
  if (event.type === "text") process.stdout.write(event.delta);
}
```

Events are normalized regardless of the underlying provider: `start`, `text`, `thinking`, `tool_call`, `usage`, `done`. Anything the SDK doesn't recognize comes through as `{ type: "raw" }` rather than being dropped. If the gateway sends an error mid-stream, it throws out of the loop as a typed error.

## Media and vision

```ts
const img = await client.images.generate({ provider: "openai", prompt: "a yellow canary" });
const speech = await client.audio.speech({ provider: "elevenlabs", text: "Hello there" });
const { text } = await client.audio.transcribe({ provider: "elevenlabs", audio, mimeType: "audio/mp3" });
const song = await client.audio.music({ prompt: "calm lo-fi", durationMs: 20000 });
const { detections } = await client.vision.detect({ image });
```

## Embeddings

Embed text into vectors with a local model (LM Studio), for customer-side RAG. The gateway processes the text transiently and stores nothing — you keep the vectors and documents in your own store (e.g. pgvector, sqlite-vec).

```ts
const { embeddings, dimensions } = await client.embeddings.create({
  provider: "lmstudio",
  model: "nomic-embed-text-v1.5",
  input: ["first chunk of text", "second chunk of text"],
});
```

OpenAI embedding clients work too: point them at `<baseURL>/v1` and use `lmstudio/<model>`.

## Errors

Every failure is a subclass of `APIError`: `AuthenticationError`, `PermissionError`, `RateLimitError`, `BadRequestError`, `NotFoundError`, `InternalServerError`, and `APIConnectionError` / `APIConnectionTimeoutError`. Branch on `.code` or `.status`, not `.message`, since the gateway sanitizes messages in production.

```ts
import { RateLimitError } from "@canarycoders/ai";

try {
  await client.chat.complete({ provider: "openai", messages });
} catch (err) {
  if (err instanceof RateLimitError) {
    console.warn("slow down", err.retryAfterMs, err.remaining);
  } else {
    throw err;
  }
}
```

Transient failures (429, 5xx, network drops) retry with exponential backoff and jitter. The default is two retries; set `maxRetries` to change it. Queue submits never retry on 5xx, so a job can't be enqueued twice.

## Realtime and conversational agents

The SDK belongs on your backend, where the API key stays. It mints a short-lived credential; the browser opens the actual WebRTC connection.

```ts
import { toBrokeredCredential } from "@canarycoders/ai";

// backend
const session = await client.realtime.sessions.create({ kind: "voice", voice: "alloy" });
return toBrokeredCredential(session);   // safe to send to the browser
```

```ts
// browser
import { connectRealtime } from "@canarycoders/ai/realtime-client";

const conn = await connectRealtime({ credential, onEvent: console.log });
conn.send({ type: "response.create" });
```

For ElevenLabs conversational agents, `client.conversations.sessions.create()` returns a signed URL you hand to the ElevenLabs client.

## Drop-in OpenAI / Anthropic

Already using the official SDKs? Point them at the gateway and keep your code:

```ts
import OpenAI from "openai";

const oa = new OpenAI(client.compat.openai());
await oa.chat.completions.create({
  model: "openai/gpt-4o-mini",   // provider/modelId
  messages,
  stream: true,
});
```

## Client options

| Option | Default | Notes |
|---|---|---|
| `apiKey` | `CANARY_AI_API_KEY` | API key (`clk_live_…`) |
| `baseURL` | hosted gateway | override for self-hosted |
| `authStyle` | `"bearer"` | or `"x-api-key"` |
| `timeoutMs` | `60000` | per-request total timeout |
| `maxRetries` | `2` | retries for transient failures |
| `fetch` | global | inject a custom fetch |
| `defaultTag` | — | attached to requests for usage attribution |
| `poll` | — | default poll timing for queued ops |

## Keeping types in sync

The gateway API is the source of truth. Regenerate types from its OpenAPI spec and diff them against the hand-written ones:

```bash
bun run gen:openapi
```

## License

MIT
