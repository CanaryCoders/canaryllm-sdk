import type { FetchLike } from "../../src/core/fetch";

export interface RecordedRequest {
  url: string;
  method: string;
  body?: any;
  headers: Record<string, string>;
}

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

export function textResponse(
  text: string,
  init: { status?: number; contentType?: string } = {},
): Response {
  return new Response(text, {
    status: init.status ?? 200,
    headers: { "content-type": init.contentType ?? "text/plain" },
  });
}

export function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(encoder.encode(chunks[i++]!));
      else controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

export function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(encoder.encode(chunks[i++]!));
      else controller.close();
    },
  });
}

export function mockFetch(
  handler: (req: RecordedRequest) => Response | Promise<Response>,
): { fetch: FetchLike; calls: RecordedRequest[] } {
  const calls: RecordedRequest[] = [];
  const fetch = (async (input: any, init?: any): Promise<Response> => {
    const url = typeof input === "string" ? input : String(input);
    const method: string = init?.method ?? "GET";
    let body: any;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const headers: Record<string, string> = {};
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => {
        headers[k] = v;
      });
    }
    const rec: RecordedRequest = { url, method, body, headers };
    calls.push(rec);
    return handler(rec);
  }) as FetchLike;
  return { fetch, calls };
}

/** Return a sequence of responses across successive calls (last one repeats). */
export function sequence(
  ...responses: Array<Response | (() => Response)>
): () => Response {
  let i = 0;
  return () => {
    const r = responses[Math.min(i++, responses.length - 1)]!;
    return typeof r === "function" ? r() : r;
  };
}
