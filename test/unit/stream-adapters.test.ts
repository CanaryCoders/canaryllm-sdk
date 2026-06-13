import { describe, expect, test } from "bun:test";
import { RateLimitError } from "../../src/core/errors";
import type { SSEFrame } from "../../src/core/sse";
import {
  nativeQueueAdapter,
  openAIAdapter,
} from "../../src/core/stream-adapters";
import type { ChatStreamEvent } from "../../src/types/chat";

async function* framesOf(...frames: SSEFrame[]): AsyncGenerator<SSEFrame> {
  for (const f of frames) yield f;
}

async function collect(
  gen: AsyncGenerator<ChatStreamEvent>,
): Promise<ChatStreamEvent[]> {
  const out: ChatStreamEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

describe("openAIAdapter", () => {
  test("assembles text deltas and ends on [DONE]", async () => {
    const events = await collect(
      openAIAdapter(
        framesOf(
          {
            data: JSON.stringify({
              choices: [
                { index: 0, delta: { role: "assistant", content: "He" } },
              ],
            }),
          },
          {
            data: JSON.stringify({
              choices: [
                { index: 0, delta: { content: "llo" }, finish_reason: "stop" },
              ],
            }),
          },
          { data: "[DONE]" },
        ),
        false,
      ),
    );
    const text = events
      .filter((e) => e.type === "text")
      .map((e) => (e.type === "text" ? e.delta : ""))
      .join("");
    expect(text).toBe("Hello");
    expect(events.some((e) => e.type === "start")).toBe(true);
    expect(events.at(-1)?.type).toBe("done");
  });

  test("throws a typed error on a mid-stream error chunk", async () => {
    const gen = openAIAdapter(
      framesOf({
        data: JSON.stringify({ error: { message: "rl", code: 429 } }),
      }),
      false,
    );
    await expect(collect(gen)).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe("nativeQueueAdapter", () => {
  test("emits start, text, done", async () => {
    const events = await collect(
      nativeQueueAdapter(
        framesOf(
          { event: "start", data: '{"queueId":"q1"}' },
          { event: "chunk", data: JSON.stringify({ delta: "hi" }) },
          { event: "done", data: "{}" },
        ),
        false,
      ),
    );
    expect(events[0]?.type).toBe("start");
    const text = events.find((e) => e.type === "text");
    expect(text?.type === "text" ? text.delta : "").toBe("hi");
    expect(events.at(-1)?.type).toBe("done");
  });

  test("throws on an error event", async () => {
    const gen = nativeQueueAdapter(
      framesOf({
        event: "error",
        data: JSON.stringify({ error: "boom", code: "INTERNAL_ERROR" }),
      }),
      false,
    );
    await expect(collect(gen)).rejects.toBeTruthy();
  });
});
