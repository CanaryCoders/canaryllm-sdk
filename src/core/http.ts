import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  RateLimitError,
  toAPIError,
} from "./errors";
import { detectRuntime, resolveFetch, type FetchLike } from "./fetch";
import {
  backoffDelay,
  DEFAULT_RETRY_POLICY,
  RETRY_IDEMPOTENT,
  RETRY_NONE,
  RETRY_SUBMIT,
  type RetryFlags,
  type RetryPolicy,
  shouldRetry,
} from "./retry";
import { sleep } from "../utils/sleep";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type RetryMode = "idempotent" | "submit" | "none";

export interface TransportConfig {
  apiKey?: string;
  baseURL: string;
  authStyle: "bearer" | "x-api-key";
  timeoutMs: number;
  maxRetries: number;
  fetch?: FetchLike;
  defaultHeaders?: Record<string, string>;
  defaultTag?: string;
  userAgent?: string;
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** total timeout for this call; 0 disables (used for streams) */
  timeoutMs?: number;
  /** unwrap `{ success, data }` envelopes and return `data` (default true) */
  unwrap?: boolean;
  retry?: RetryMode;
}

const RETRY_FLAGS: Record<RetryMode, RetryFlags> = {
  idempotent: RETRY_IDEMPOTENT,
  submit: RETRY_SUBMIT,
  none: RETRY_NONE,
};

export class Transport {
  readonly baseURL: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  private readonly apiKey?: string;
  private readonly authStyle: "bearer" | "x-api-key";
  private readonly fetchImpl: FetchLike;
  private readonly defaultHeaders: Record<string, string>;
  private readonly defaultTag?: string;
  private readonly userAgent: string;
  private readonly retryPolicy: RetryPolicy;

  constructor(config: TransportConfig) {
    this.baseURL = config.baseURL.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.authStyle = config.authStyle;
    this.timeoutMs = config.timeoutMs;
    this.maxRetries = config.maxRetries;
    this.fetchImpl = resolveFetch(config.fetch);
    this.defaultHeaders = config.defaultHeaders ?? {};
    this.defaultTag = config.defaultTag;
    this.userAgent = config.userAgent ?? `canaryllm-sdk (${detectRuntime()})`;
    this.retryPolicy = { ...DEFAULT_RETRY_POLICY, maxRetries: config.maxRetries };
  }

  async json<T>(
    method: HttpMethod,
    path: string,
    opts: RequestOptions = {},
  ): Promise<T> {
    const res = await this.send(method, path, opts);
    if (!res.ok) throw await toAPIError(res);
    if (res.status === 204) return undefined as T;
    const body = await res.json().catch(() => undefined);
    return this.maybeUnwrap<T>(body, opts.unwrap);
  }

  /** Perform the request and return the Response without throwing on non-2xx. */
  async raw(
    method: HttpMethod,
    path: string,
    opts: RequestOptions = {},
  ): Promise<Response> {
    return this.send(method, path, opts);
  }

  /** Perform the request and return the raw text body (CSV, YAML, …). */
  async text(
    method: HttpMethod,
    path: string,
    opts: RequestOptions = {},
  ): Promise<string> {
    const res = await this.send(method, path, opts);
    if (!res.ok) throw await toAPIError(res);
    return res.text();
  }

  /** Open a streaming response. Throws if the initial response is an error. */
  async stream(
    method: HttpMethod,
    path: string,
    opts: RequestOptions = {},
  ): Promise<Response> {
    const res = await this.send(method, path, {
      ...opts,
      timeoutMs: opts.timeoutMs ?? 0,
    });
    if (!res.ok) throw await toAPIError(res);
    return res;
  }

  private maybeUnwrap<T>(body: unknown, unwrap: boolean | undefined): T {
    if (unwrap === false) return body as T;
    if (
      body &&
      typeof body === "object" &&
      "success" in body &&
      "data" in body
    ) {
      return (body as { data: T }).data;
    }
    return body as T;
  }

  private async send(
    method: HttpMethod,
    path: string,
    opts: RequestOptions,
  ): Promise<Response> {
    const url = this.buildUrl(path, opts.query);
    const hasBody = opts.body !== undefined;
    const isForm = hasBody && isFormData(opts.body);
    const headers = this.buildHeaders(opts.headers, hasBody && !isForm);
    const payload: BodyInit | undefined = !hasBody
      ? undefined
      : isForm
        ? (opts.body as BodyInit)
        : JSON.stringify(this.withDefaultTag(opts.body));
    const flags = RETRY_FLAGS[opts.retry ?? "idempotent"];
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    return this.withRetry(
      () => this.execute(method, url, headers, payload, opts.signal, timeoutMs),
      flags,
      opts.signal,
    );
  }

  private withDefaultTag(body: unknown): unknown {
    if (
      this.defaultTag &&
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      (body as Record<string, unknown>).tag === undefined
    ) {
      return { ...(body as Record<string, unknown>), tag: this.defaultTag };
    }
    return body;
  }

  private async withRetry(
    fn: () => Promise<Response>,
    flags: RetryFlags,
    signal: AbortSignal | undefined,
  ): Promise<Response> {
    let attempt = 0;
    for (;;) {
      try {
        const res = await fn();
        if (!res.ok && attempt < this.maxRetries) {
          const candidate = await toAPIError(res.clone());
          if (shouldRetry(candidate, flags)) {
            const retryAfter =
              candidate instanceof RateLimitError
                ? candidate.retryAfterMs
                : undefined;
            await sleep(backoffDelay(attempt, this.retryPolicy, retryAfter), signal);
            attempt++;
            continue;
          }
        }
        return res;
      } catch (err) {
        if (attempt < this.maxRetries && shouldRetry(err, flags)) {
          await sleep(backoffDelay(attempt, this.retryPolicy), signal);
          attempt++;
          continue;
        }
        throw err;
      }
    }
  }

  private async execute(
    method: HttpMethod,
    url: string,
    headers: Record<string, string>,
    body: BodyInit | undefined,
    signal: AbortSignal | undefined,
    timeoutMs: number,
  ): Promise<Response> {
    const { signal: composite, cleanup } = linkedSignal(signal, timeoutMs);
    try {
      return await this.fetchImpl(url, {
        method,
        headers,
        body,
        signal: composite,
      });
    } catch (err) {
      if (signal?.aborted) {
        throw signal.reason ?? new APIConnectionError("Request aborted");
      }
      if (isTimeoutAbort(err)) {
        const e = new APIConnectionTimeoutError("Request timed out");
        e.phase = "total";
        throw e;
      }
      if (err instanceof APIError) throw err;
      throw new APIConnectionError(
        err instanceof Error ? err.message : "Connection error",
      );
    } finally {
      cleanup();
    }
  }

  private buildHeaders(
    extra: Record<string, string> | undefined,
    hasBody: boolean,
  ): Record<string, string> {
    const h: Record<string, string> = {
      Accept: "application/json",
      ...this.defaultHeaders,
      ...(extra ?? {}),
    };
    if (hasBody && !("Content-Type" in h)) {
      h["Content-Type"] = "application/json";
    }
    if (this.apiKey) {
      if (this.authStyle === "x-api-key") h["X-API-Key"] = this.apiKey;
      else h["Authorization"] = `Bearer ${this.apiKey}`;
    }
    if (!("User-Agent" in h)) h["User-Agent"] = this.userAgent;
    return h;
  }

  private buildUrl(
    path: string,
    query: RequestOptions["query"],
  ): string {
    let url = /^https?:\/\//.test(path)
      ? path
      : `${this.baseURL}${path.startsWith("/") ? "" : "/"}${path}`;
    if (query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) qs.set(k, String(v));
      }
      const s = qs.toString();
      if (s) url += (url.includes("?") ? "&" : "?") + s;
    }
    return url;
  }
}

function isTimeoutAbort(err: unknown): boolean {
  return err instanceof Error && err.name === "TimeoutError";
}

function isFormData(v: unknown): v is FormData {
  return typeof FormData !== "undefined" && v instanceof FormData;
}

function linkedSignal(
  userSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const cleanups: Array<() => void> = [];

  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort(userSignal.reason);
    } else {
      const onAbort = () => controller.abort(userSignal.reason);
      userSignal.addEventListener("abort", onAbort, { once: true });
      cleanups.push(() => userSignal.removeEventListener("abort", onAbort));
    }
  }

  if (timeoutMs && timeoutMs > 0) {
    const timer = setTimeout(
      () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
      timeoutMs,
    );
    cleanups.push(() => clearTimeout(timer));
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const c of cleanups) c();
    },
  };
}
