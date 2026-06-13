import { describe, expect, test } from "bun:test";
import {
  AuthenticationError,
  BadRequestError,
  buildError,
  InternalServerError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  streamError,
} from "../../src/core/errors";

describe("buildError", () => {
  test("native 400 envelope → BadRequestError with issues", () => {
    const e = buildError(400, {
      success: false,
      error: "bad",
      code: "VALIDATION_ERROR",
      details: { issues: [{ path: ["x"] }] },
    });
    expect(e).toBeInstanceOf(BadRequestError);
    expect(e.message).toBe("bad");
    expect(e.code).toBe("VALIDATION_ERROR");
    expect((e as BadRequestError).validationIssues).toEqual([{ path: ["x"] }]);
  });

  test("status → subclass mapping", () => {
    expect(
      buildError(401, { success: false, error: "x", code: "INVALID_API_KEY" }),
    ).toBeInstanceOf(AuthenticationError);
    expect(
      buildError(403, {
        success: false,
        error: "x",
        code: "INSUFFICIENT_PERMISSIONS",
      }),
    ).toBeInstanceOf(PermissionError);
    expect(
      buildError(404, { success: false, error: "x", code: "TASK_NOT_FOUND" }),
    ).toBeInstanceOf(NotFoundError);
    expect(
      buildError(503, { success: false, error: "x", code: "X" }),
    ).toBeInstanceOf(InternalServerError);
  });

  test("429 with details + retry-after", () => {
    const e = buildError(
      429,
      {
        success: false,
        error: "rate limited",
        code: "RATE_LIMIT_EXCEEDED",
        details: { remaining: { minute: 0, day: 5 } },
      },
      new Headers({ "retry-after": "2" }),
    ) as RateLimitError;
    expect(e).toBeInstanceOf(RateLimitError);
    expect(e.remaining).toEqual({ minute: 0, day: 5 });
    expect(e.retryAfterMs).toBe(2000);
  });

  test("429 without details (prod) is undefined-safe", () => {
    const e = buildError(429, {
      success: false,
      error: "rate limited",
      code: "RATE_LIMIT_EXCEEDED",
    }) as RateLimitError;
    expect(e.remaining).toBeUndefined();
  });

  test("OpenAI-shaped error body", () => {
    const e = buildError(400, {
      error: {
        message: "unknown model",
        type: "invalid_request_error",
        code: "model_not_found",
      },
    });
    expect(e).toBeInstanceOf(BadRequestError);
    expect(e.message).toBe("unknown model");
    expect(e.code).toBe("model_not_found");
  });

  test("Anthropic-shaped error body", () => {
    const e = buildError(401, {
      type: "error",
      error: { type: "authentication_error", message: "bad key" },
    });
    expect(e.message).toBe("bad key");
    expect(e.code).toBe("authentication_error");
  });

  test("requestId pulled from headers", () => {
    const e = buildError(500, {}, new Headers({ "x-request-id": "req_123" }));
    expect(e.requestId).toBe("req_123");
  });
});

describe("streamError", () => {
  test("native stream error maps code → status", () => {
    expect(
      streamError({ error: "rate limited", code: "RATE_LIMIT_EXCEEDED" }),
    ).toBeInstanceOf(RateLimitError);
  });

  test("openai mid-stream numeric code", () => {
    const e = streamError({
      error: { message: "boom", type: "server_error", code: 500 },
    });
    expect(e).toBeInstanceOf(InternalServerError);
    expect(e.message).toBe("boom");
  });
});
