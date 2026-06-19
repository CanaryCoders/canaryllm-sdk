import { describe, expect, test } from "bun:test";
import { CanaryCodersAI } from "../../src/client";
import type { EmbeddingResult } from "../../src/types/media";
import { jsonResponse, mockFetch, type RecordedRequest } from "./helpers";

const RESULT: EmbeddingResult = {
  embeddings: [
    [0.1, 0.2, 0.3],
    [0.4, 0.5, 0.6],
  ],
  model: "nomic-embed-text-v1.5",
  provider: "lmstudio",
  dimensions: 3,
  usage: { inputTokens: 12, totalTokens: 12 },
};

function client(handler: (req: RecordedRequest) => Response) {
  const { fetch, calls } = mockFetch(handler);
  const c = new CanaryCodersAI({
    apiKey: "clk_test",
    baseURL: "https://api.test",
    fetch,
    poll: { initialIntervalMs: 1, maxIntervalMs: 2 },
  });
  return { c, calls };
}

describe("embeddings.create", () => {
  test("submits to /api/llm/embeddings then polls to the vectors", async () => {
    const { c, calls } = client((req) => {
      if (req.url.endsWith("/api/llm/embeddings")) {
        return jsonResponse({ success: true, data: { queueId: "q1", status: "queued" } });
      }
      if (req.url.endsWith("/api/llm/queue/result")) {
        return jsonResponse({
          success: true,
          data: { queueId: "q1", status: "completed", result: RESULT },
        });
      }
      return jsonResponse({ error: "unexpected" }, { status: 500 });
    });

    const res = await c.embeddings.create({
      provider: "lmstudio",
      model: "nomic-embed-text-v1.5",
      input: ["first", "second"],
    });

    expect(res.embeddings).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ]);
    expect(res.dimensions).toBe(3);
    expect(res.usage.inputTokens).toBe(12);

    const submit = calls.find((r) => r.url.endsWith("/api/llm/embeddings"))!;
    expect(submit.method).toBe("POST");
    expect(submit.body.provider).toBe("lmstudio");
    expect(submit.body.input).toEqual(["first", "second"]);
  });

  test("createJob returns a Job handle resolving to the result", async () => {
    const { c } = client((req) => {
      if (req.url.endsWith("/api/llm/embeddings")) {
        return jsonResponse({ success: true, data: { queueId: "q2", status: "queued" } });
      }
      if (req.url.endsWith("/api/llm/queue/result")) {
        return jsonResponse({
          success: true,
          data: { queueId: "q2", status: "completed", result: RESULT },
        });
      }
      return jsonResponse({ error: "unexpected path" }, { status: 500 });
    });

    const job = await c.embeddings.createJob({ provider: "lmstudio", input: "hello" });
    expect(job.id).toBe("q2");
    const res = await job.result({ initialIntervalMs: 1 });
    expect(res.embeddings).toHaveLength(2);
  });
});
