import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  RateLimitError,
} from "./errors";

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  factor: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  factor: 2,
};

export interface RetryFlags {
  /** retry on 408 + 5xx */
  onStatus: boolean;
  /** retry on 429 */
  on429: boolean;
  /** retry on connection errors (reset/refused), excluding timeouts */
  onConnect: boolean;
  /** retry on connect/read/total timeouts */
  onTimeout: boolean;
}

/** Idempotent reads: retry freely. */
export const RETRY_IDEMPOTENT: RetryFlags = {
  onStatus: true,
  on429: true,
  onConnect: true,
  onTimeout: true,
};

/**
 * Non-idempotent submits: a 5xx may mean the job enqueued, so don't retry it
 * (would double-charge). A 429 means the request was rejected, so it's safe.
 * A timeout after bytes were sent is ambiguous, so don't retry it either.
 */
export const RETRY_SUBMIT: RetryFlags = {
  onStatus: false,
  on429: true,
  onConnect: true,
  onTimeout: false,
};

export const RETRY_NONE: RetryFlags = {
  onStatus: false,
  on429: false,
  onConnect: false,
  onTimeout: false,
};

export function shouldRetry(err: unknown, flags: RetryFlags): boolean {
  if (err instanceof RateLimitError) return flags.on429;
  if (err instanceof APIConnectionTimeoutError) return flags.onTimeout;
  if (err instanceof APIConnectionError) return flags.onConnect;
  if (err instanceof APIError && typeof err.status === "number") {
    return flags.onStatus && (err.status === 408 || err.status >= 500);
  }
  // raw network failure that escaped our wrapper
  if (err instanceof TypeError) return flags.onConnect;
  return false;
}

/** Exponential backoff with full jitter, honoring an explicit Retry-After. */
export function backoffDelay(
  attempt: number,
  policy: RetryPolicy,
  retryAfterMs?: number,
): number {
  if (retryAfterMs !== undefined) return retryAfterMs;
  const ceiling = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * Math.pow(policy.factor, attempt),
  );
  return Math.random() * ceiling;
}
