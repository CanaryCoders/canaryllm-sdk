import { describe, expect, test } from "bun:test";
import { iterateSSE, type SSEFrame } from "../../src/core/sse";
import { streamFromChunks } from "./helpers";

async function collect(chunks: string[]): Promise<SSEFrame[]> {
  const frames: SSEFrame[] = [];
  for await (const f of iterateSSE(streamFromChunks(chunks))) frames.push(f);
  return frames;
}

describe("iterateSSE", () => {
  test("parses event + data frames", async () => {
    const frames = await collect([
      'event: chunk\ndata: {"x":1}\n\nevent: done\ndata: {}\n\n',
    ]);
    expect(frames).toEqual([
      { event: "chunk", id: undefined, data: '{"x":1}' },
      { event: "done", id: undefined, data: "{}" },
    ]);
  });

  test("reassembles a frame split across chunks", async () => {
    const frames = await collect(["event: chu", 'nk\ndata: {"a":', "1}\n\n"]);
    expect(frames).toEqual([{ event: "chunk", id: undefined, data: '{"a":1}' }]);
  });

  test("skips keep-alive comment lines", async () => {
    const frames = await collect([": keep-alive\n\ndata: hi\n\n"]);
    expect(frames).toEqual([{ event: undefined, id: undefined, data: "hi" }]);
  });

  test("normalizes CRLF and joins multi-line data", async () => {
    const frames = await collect(["data: a\r\ndata: b\r\n\r\n"]);
    expect(frames).toEqual([{ event: undefined, id: undefined, data: "a\nb" }]);
  });

  test("flushes a trailing frame with no final blank line", async () => {
    const frames = await collect(["data: [DONE]"]);
    expect(frames).toEqual([
      { event: undefined, id: undefined, data: "[DONE]" },
    ]);
  });
});
