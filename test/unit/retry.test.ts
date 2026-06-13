import { describe, expect, test } from "bun:test";
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  BadRequestError,
  InternalServerError,
  RateLimitError,
} from "../../src/core/errors";
import {
  backoffDelay,
  DEFAULT_RETRY_POLICY,
  RETRY_IDEMPOTENT,
  RETRY_SUBMIT,
  shouldRetry,
} from "../../src/core/retry";

describe("shouldRetry", () => {
  test("idempotent retries 5xx / 429 / connect / timeout", () => {
    expect(
      shouldRetry(new InternalServerError("x", { status: 500 }), RETRY_IDEMPOTENT),
    ).toBe(true);
    expect(
      shouldRetry(new RateLimitError("x", { status: 429 }), RETRY_IDEMPOTENT),
    ).toBe(true);
    expect(shouldRetry(new APIConnectionError("x"), RETRY_IDEMPOTENT)).toBe(true);
    expect(
      shouldRetry(new APIConnectionTimeoutError("x"), RETRY_IDEMPOTENT),
    ).toBe(true);
  });

  test("idempotent never retries 400", () => {
    expect(
      shouldRetry(new BadRequestError("x", { status: 400 }), RETRY_IDEMPOTENT),
    ).toBe(false);
  });

  test("submit retries 429 / connect but not 5xx / timeout", () => {
    expect(
      shouldRetry(new InternalServerError("x", { status: 500 }), RETRY_SUBMIT),
    ).toBe(false);
    expect(
      shouldRetry(new APIConnectionTimeoutError("x"), RETRY_SUBMIT),
    ).toBe(false);
    expect(
      shouldRetry(new RateLimitError("x", { status: 429 }), RETRY_SUBMIT),
    ).toBe(true);
    expect(shouldRetry(new APIConnectionError("x"), RETRY_SUBMIT)).toBe(true);
  });
});

describe("backoffDelay", () => {
  test("honors an explicit retry-after", () => {
    expect(backoffDelay(0, DEFAULT_RETRY_POLICY, 1234)).toBe(1234);
  });

  test("stays within the ceiling (full jitter)", () => {
    for (let i = 0; i < 50; i++) {
      const d = backoffDelay(3, DEFAULT_RETRY_POLICY);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(DEFAULT_RETRY_POLICY.maxDelayMs);
    }
  });
});
