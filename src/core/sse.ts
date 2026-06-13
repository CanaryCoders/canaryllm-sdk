import { APIConnectionError, APIConnectionTimeoutError } from "./errors";

export interface SSEFrame {
  event?: string;
  id?: string;
  data: string;
}

export interface SSEOptions {
  signal?: AbortSignal;
  /** abort the stream if no bytes arrive within this window */
  idleMs?: number;
}

/**
 * Read an SSE body as a sequence of frames. Runtime-agnostic (uses `getReader`
 * rather than async iteration). Handles CRLF, multi-line `data:`, comment
 * keep-alive lines, partial UTF-8 across chunks, and a trailing frame with no
 * final blank line.
 */
export async function* iterateSSE(
  body: ReadableStream<Uint8Array>,
  options: SSEOptions = {},
): AsyncGenerator<SSEFrame> {
  const { signal, idleMs } = options;
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let idleFired = false;
  let userAborted = false;

  const onAbort = () => {
    userAborted = true;
    void reader.cancel(signal?.reason).catch(() => {});
  };
  if (signal) {
    if (signal.aborted) {
      reader.releaseLock();
      throw signal.reason ?? new APIConnectionError("Stream aborted");
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    for (;;) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      if (idleMs && idleMs > 0) {
        timer = setTimeout(() => {
          idleFired = true;
          void reader.cancel().catch(() => {});
        }, idleMs);
      }
      let done = false;
      let chunk: Uint8Array | undefined;
      try {
        const r = await reader.read();
        done = r.done;
        chunk = r.value;
      } finally {
        if (timer) clearTimeout(timer);
      }

      if (done) break;
      if (!chunk) continue;
      buffer += decoder.decode(chunk, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const rawFrame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const frame = parseFrame(rawFrame);
        if (frame) yield frame;
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const frame = parseFrame(buffer);
      if (frame) yield frame;
    }
  } finally {
    if (signal) signal.removeEventListener("abort", onAbort);
    try {
      reader.releaseLock();
    } catch {
      /* already released by cancel() */
    }
  }

  if (userAborted) {
    throw signal?.reason ?? new APIConnectionError("Stream aborted");
  }
  if (idleFired) {
    const err = new APIConnectionTimeoutError("Stream idle timeout");
    err.phase = "read";
    throw err;
  }
}

function parseFrame(raw: string): SSEFrame | null {
  let event: string | undefined;
  let id: string | undefined;
  const dataLines: string[] = [];
  let sawData = false;

  for (const line of raw.split("\n")) {
    if (line === "") continue;
    if (line.startsWith(":")) continue; // comment / keep-alive
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    let value = idx === -1 ? "" : line.slice(idx + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") event = value;
    else if (field === "id") id = value;
    else if (field === "data") {
      dataLines.push(value);
      sawData = true;
    }
  }

  if (!sawData && event === undefined) return null;
  return { event, id, data: dataLines.join("\n") };
}
