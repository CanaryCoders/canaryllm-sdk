import { describe, expect, test } from "bun:test";
import { CanaryLLM } from "../../src/index";
import { jsonResponse, mockFetch } from "./helpers";

describe("chat.complete", () => {
  test("submits then polls to the final result", async () => {
    let resultCalls = 0;
    const { fetch, calls } = mockFetch((req) => {
      if (req.url.endsWith("/api/llm/complete")) {
        return jsonResponse({
          success: true,
          data: { queueId: "q1", status: "queued" },
        });
      }
      if (req.url.endsWith("/api/llm/queue/result")) {
        resultCalls++;
        if (resultCalls < 2) {
          return jsonResponse(
            { success: false, error: "processing", data: { status: "processing" } },
            { status: 202 },
          );
        }
        return jsonResponse({
          success: true,
          data: {
            queueId: "q1",
            status: "completed",
            result: {
              content: "hi",
              usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
              model: "gpt-4o-mini",
              provider: "openai",
            },
          },
        });
      }
      return jsonResponse({}, { status: 404 });
    });

    const client = new CanaryLLM({
      apiKey: "clk_live_x",
      baseURL: "https://api.test",
      fetch,
      maxRetries: 0,
    });
    const res = await client.chat.complete(
      { provider: "openai", messages: [{ role: "user", content: "hey" }] },
      { initialIntervalMs: 1, maxIntervalMs: 2 },
    );
    expect(res.content).toBe("hi");
    expect(res.usage.totalTokens).toBe(2);
    expect(calls[0]?.body).toMatchObject({ provider: "openai" });
  });

  test("submit() returns a Job handle exposing the queue id", async () => {
    const { fetch } = mockFetch((req) => {
      if (req.url.endsWith("/api/llm/complete")) {
        return jsonResponse({
          success: true,
          data: { queueId: "qABC", status: "queued" },
        });
      }
      return jsonResponse({
        success: true,
        data: { status: "completed", result: {} },
      });
    });
    const client = new CanaryLLM({
      apiKey: "x",
      baseURL: "https://api.test",
      fetch,
    });
    const job = await client.chat.submit({
      provider: "openai",
      messages: [{ role: "user", content: "x" }],
    });
    expect(job.id).toBe("qABC");
  });
});
