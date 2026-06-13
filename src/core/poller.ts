import type { JobStatus, PollOptions, TaskKind } from "../types/queue";
import { sleep } from "../utils/sleep";
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  toAPIError,
} from "./errors";
import type { APIError } from "./errors";
import type { Transport } from "./http";

/** Per-task-kind wall-clock budget, matching the server's own timeouts. */
const DEFAULT_MAX_WAIT_MS: Record<TaskKind, number> = {
  completion: 35 * 60_000,
  image: 6 * 60_000,
  video: 65 * 60_000,
  tts: 6 * 60_000,
  stt: 12 * 60_000,
  "sound-effect": 6 * 60_000,
  music: 17 * 60_000,
  dialogue: 6 * 60_000,
  vision: 6 * 60_000,
  embedding: 6 * 60_000,
};

type PollOutcome<T> =
  | { kind: "completed"; result: T }
  | { kind: "processing"; status: JobStatus; position?: number }
  | { kind: "failed"; error: APIError };

async function pollOnce<T>(
  transport: Transport,
  queueId: string,
  signal: AbortSignal | undefined,
): Promise<PollOutcome<T>> {
  const res = await transport.raw("POST", "/api/llm/queue/result", {
    body: { queueId },
    signal,
    retry: "idempotent",
  });

  if (res.status === 202) {
    const body = (await res.json().catch(() => ({}))) as {
      data?: { status?: JobStatus; position?: number };
    };
    return {
      kind: "processing",
      status: body.data?.status ?? "processing",
      position: body.data?.position,
    };
  }

  if (res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      data?: { result?: T };
    };
    return { kind: "completed", result: body.data?.result as T };
  }

  return { kind: "failed", error: await toAPIError(res) };
}

/** Submit-then-poll until the queued job resolves, fails, or the budget runs out. */
export async function pollToResult<T>(
  transport: Transport,
  queueId: string,
  taskKind: TaskKind,
  opts: PollOptions = {},
): Promise<T> {
  const initial = opts.initialIntervalMs ?? 500;
  const factor = opts.backoffFactor ?? 1.5;
  const maxInterval = opts.maxIntervalMs ?? 5000;
  const jitter = opts.jitter ?? 0.2;
  const maxWait = opts.maxWaitMs ?? DEFAULT_MAX_WAIT_MS[taskKind];
  const signal = opts.signal;

  const start = Date.now();
  const deadline = start + maxWait;
  let interval = initial;

  for (;;) {
    signal?.throwIfAborted();

    let outcome: PollOutcome<T>;
    try {
      outcome = await pollOnce<T>(transport, queueId, signal);
    } catch (err) {
      // A transient network failure on a single poll shouldn't end the wait;
      // keep polling until the deadline. A user abort still propagates.
      if (signal?.aborted) throw err;
      if (err instanceof APIConnectionError) {
        outcome = { kind: "processing", status: "processing" };
      } else {
        throw err;
      }
    }

    if (outcome.kind === "completed") return outcome.result;
    if (outcome.kind === "failed") throw outcome.error;

    opts.onPoll?.({
      status: outcome.status,
      position: outcome.position,
      elapsedMs: Date.now() - start,
    });

    const now = Date.now();
    if (now >= deadline) {
      const err = new APIConnectionTimeoutError(
        `Queue task ${queueId} did not complete within ${maxWait}ms (last status: ${outcome.status})`,
      );
      err.phase = "total";
      throw err;
    }

    const base = Math.min(maxInterval, interval);
    const jittered = base * (1 - jitter * Math.random());
    const wait = Math.min(jittered, deadline - now);
    await sleep(Math.max(0, wait), signal);
    interval *= factor;
  }
}
