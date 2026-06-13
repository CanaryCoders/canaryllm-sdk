export interface APIErrorInit {
  status?: number;
  code?: string | number;
  requestId?: string;
  headers?: Headers;
  details?: unknown;
  raw?: unknown;
}

/** Base class for every error the SDK throws from an API interaction. */
export class APIError extends Error {
  readonly status?: number;
  readonly code?: string | number;
  readonly requestId?: string;
  readonly headers?: Headers;
  readonly details?: unknown;
  readonly raw?: unknown;

  constructor(message: string, init: APIErrorInit = {}) {
    super(message);
    this.name = new.target.name;
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId;
    this.headers = init.headers;
    this.details = init.details;
    this.raw = init.raw;
  }
}

export class BadRequestError extends APIError {
  /** parsed Zod issues from the server, when present */
  readonly validationIssues?: unknown;
  constructor(message: string, init: APIErrorInit = {}) {
    super(message, init);
    this.validationIssues = extractIssues(init.details);
  }
}
export class AuthenticationError extends APIError {}
export class PermissionError extends APIError {}
export class NotFoundError extends APIError {}
export class ConflictError extends APIError {}
export class UnprocessableEntityError extends APIError {}

export class RateLimitError extends APIError {
  /** remaining request budget; only sent by the server in development */
  readonly remaining?: { minute: number; day: number };
  readonly retryAfterMs?: number;
  constructor(message: string, init: APIErrorInit = {}) {
    super(message, init);
    const d = init.details as
      | { remaining?: { minute: number; day: number } }
      | undefined;
    this.remaining = d?.remaining;
    this.retryAfterMs = parseRetryAfter(init.headers?.get("retry-after"));
  }
}

export class InternalServerError extends APIError {}

/** Network-level failure (DNS, connection refused, TLS, reset). No HTTP status. */
export class APIConnectionError extends APIError {}

export class APIConnectionTimeoutError extends APIConnectionError {
  phase?: "connect" | "read" | "total";
}

function extractIssues(details: unknown): unknown {
  if (details && typeof details === "object" && "issues" in details) {
    return (details as { issues: unknown }).issues;
  }
  if (Array.isArray(details)) return details;
  return undefined;
}

function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const secs = Number(value);
  if (!Number.isNaN(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

/** Read a Response body without throwing on non-JSON. */
async function safeBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Build a typed error from a failed Response (reads the body). */
export async function toAPIError(response: Response): Promise<APIError> {
  const body = await safeBody(response);
  return buildError(response.status, body, response.headers);
}

/** Build a typed error from an already-parsed body + status. */
export function buildError(
  status: number | undefined,
  body: unknown,
  headers?: Headers,
): APIError {
  const requestId =
    headers?.get("x-request-id") ??
    headers?.get("x-canary-request-id") ??
    undefined;

  let message = `HTTP ${status ?? "error"}`;
  let code: string | number | undefined;
  let details: unknown;

  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if ("success" in b && typeof b.error === "string") {
      // native: { success:false, error, code, details? }
      message = b.error;
      code = b.code as string | undefined;
      details = b.details;
    } else if (
      b.error &&
      typeof b.error === "object" &&
      typeof (b.error as Record<string, unknown>).message === "string"
    ) {
      // OpenAI-shaped: { error: { message, type, code } }
      const e = b.error as Record<string, unknown>;
      message = e.message as string;
      code = (e.code ?? e.type) as string | number | undefined;
    } else if (
      b.type === "error" &&
      b.error &&
      typeof (b.error as Record<string, unknown>).message === "string"
    ) {
      // Anthropic-shaped: { type:"error", error:{ type, message } }
      const e = b.error as Record<string, unknown>;
      message = e.message as string;
      code = e.type as string | undefined;
    } else if (typeof b.message === "string") {
      message = b.message;
      code = b.code as string | undefined;
    }
  } else if (typeof body === "string" && body) {
    message = body;
  }

  return errorFromStatus(status, message, {
    status,
    code,
    requestId,
    headers,
    details,
    raw: body,
  });
}

function errorFromStatus(
  status: number | undefined,
  message: string,
  init: APIErrorInit,
): APIError {
  switch (true) {
    case status === 400:
      return new BadRequestError(message, init);
    case status === 401:
      return new AuthenticationError(message, init);
    case status === 403:
      return new PermissionError(message, init);
    case status === 404:
      return new NotFoundError(message, init);
    case status === 409:
      return new ConflictError(message, init);
    case status === 422:
      return new UnprocessableEntityError(message, init);
    case status === 429:
      return new RateLimitError(message, init);
    case typeof status === "number" && status >= 500:
      return new InternalServerError(message, init);
    default:
      return new APIError(message, init);
  }
}

/** Map a code (string or numeric HTTP status) to an HTTP status. */
function statusFromCode(code: string | number | undefined): number | undefined {
  if (typeof code === "number") return code;
  switch (code) {
    case "RATE_LIMIT_EXCEEDED":
    case "RATE_LIMITED":
      return 429;
    case "INVALID_API_KEY":
    case "MISSING_API_KEY":
    case "EXPIRED_KEY":
    case "INACTIVE_KEY":
      return 401;
    case "INSUFFICIENT_PERMISSIONS":
    case "ADMIN_REQUIRED":
      return 403;
    case "VALIDATION_ERROR":
      return 400;
    case "NOT_FOUND":
    case "TASK_NOT_FOUND":
      return 404;
    default:
      return undefined;
  }
}

/** Build an error from a mid-stream SSE `error` payload. */
export function streamError(data: unknown): APIError {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    // native stream error: { error: string, code: string }
    if (typeof d.error === "string") {
      return buildError(statusFromCode(d.code as string), {
        success: false,
        error: d.error,
        code: d.code,
      });
    }
    // openai mid-stream error: { error: { message, type, code } }
    if (d.error && typeof d.error === "object") {
      const e = d.error as Record<string, unknown>;
      return buildError(statusFromCode(e.code as string | number), data);
    }
  }
  return new APIError("Stream error", { raw: data });
}
