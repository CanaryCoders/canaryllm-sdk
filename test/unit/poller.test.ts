import { describe, expect, test } from "bun:test";
import { APIConnectionTimeoutError, NotFoundError } from "../../src/core/errors";
import { Transport } from "../../src/core/http";
import { pollToResult } from "../../src/core/poller";
import { jsonResponse, mockFetch, type RecordedRequest } from "./helpers";

function transport(handler: (req: RecordedRequest) => Response): Transport {
  return new Transport({
    baseURL: "https://api.test",
    authStyle: "bearer",
    timeoutMs: 1000,
    maxRetries: 0,
    fetch: mockFetch(handler).fetch,
  });
}

describe("pollToResult", () => {
  test("swallows HTTP 202 then resolves the 200 result", async () => {
    let n = 0;
    const t = transport(() => {
      n++;
      if (n < 3) {
        return jsonResponse(
          {
            success: false,
            error: "Task still processing",
            data: { status: "processing", position: 1 },
          },
          { status: 202 },
        );
      }
      return jsonResponse({
        success: true,
        data: { queueId: "q", status: "completed", result: { content: "done" } },
      });
    });
    const res = await pollToResult<{ content: string }>(t, "q", "completion", {
      initialIntervalMs: 1,
      maxIntervalMs: 2,
      maxWaitMs: 5000,
    });
    expect(res).toEqual({ content: "done" });
    expect(n).toBeGreaterThanOrEqual(3);
  });

  test("throws NotFoundError on TASK_NOT_FOUND", async () => {
    const t = transport(() =>
      jsonResponse(
        { success: false, error: "Task not found", code: "TASK_NOT_FOUND" },
        { status: 404 },
      ),
    );
    await expect(
      pollToResult(t, "q", "image", { initialIntervalMs: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  test("times out past the budget", async () => {
    const t = transport(() =>
      jsonResponse(
        { success: false, error: "processing", data: { status: "processing" } },
        { status: 202 },
      ),
    );
    await expect(
      pollToResult(t, "q", "image", {
        initialIntervalMs: 1,
        maxIntervalMs: 2,
        maxWaitMs: 30,
      }),
    ).rejects.toBeInstanceOf(APIConnectionTimeoutError);
  });
});
