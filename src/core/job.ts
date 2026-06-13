import type { ChatStreamEvent } from "../types/chat";
import type { JobSnapshot, PollOptions, TaskKind } from "../types/queue";
import { NotFoundError, toAPIError } from "./errors";
import type { Transport } from "./http";
import { pollToResult } from "./poller";
import { streamResponse } from "./stream-adapters";

export interface JobStreamOptions {
  signal?: AbortSignal;
  includeRaw?: boolean;
  /** abort the stream if no bytes arrive within this window (default 60s) */
  idleMs?: number;
}

/**
 * A handle to a queued task. Returned by the `*Job` / `.submit()` methods so
 * callers can hold the `id`, poll, stream, or cancel out of band.
 */
export class Job<T> {
  readonly id: string;
  private readonly transport: Transport;
  private readonly taskKind: TaskKind;
  private readonly defaultPoll?: PollOptions;
  private cachedValue?: { value: T };

  constructor(
    id: string,
    transport: Transport,
    taskKind: TaskKind,
    defaultPoll?: PollOptions,
  ) {
    this.id = id;
    this.transport = transport;
    this.taskKind = taskKind;
    this.defaultPoll = defaultPoll;
  }

  /** One-shot status probe. Throws `NotFoundError` unless `allowMissing`. */
  async status(
    opts: { signal?: AbortSignal; allowMissing?: boolean } = {},
  ): Promise<JobSnapshot> {
    const res = await this.transport.raw("POST", "/api/llm/queue/status", {
      body: { queueId: this.id },
      signal: opts.signal,
    });
    if (!res.ok) throw await toAPIError(res);
    const body = (await res.json().catch(() => ({}))) as {
      data?: Record<string, any>;
    };
    const data: Record<string, any> = body.data ?? {};
    const snapshot: JobSnapshot = {
      id: this.id,
      status: (data.status as JobSnapshot["status"]) ?? "not_found",
      position: data.position,
      createdAt: data.createdAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      provider: data.provider,
      model: data.model,
      error: data.error,
    };
    if (snapshot.status === "not_found" && !opts.allowMissing) {
      throw new NotFoundError(`Queue task ${this.id} not found`, {
        status: 404,
        code: "TASK_NOT_FOUND",
      });
    }
    return snapshot;
  }

  /** Poll to completion and resolve the typed result (cached after success). */
  async result(opts: PollOptions = {}): Promise<T> {
    if (this.cachedValue) return this.cachedValue.value;
    const merged: PollOptions = { ...this.defaultPoll, ...opts };
    const cancelOnAbort = merged.cancelServerOnAbort ?? true;
    try {
      const value = await pollToResult<T>(
        this.transport,
        this.id,
        this.taskKind,
        merged,
      );
      this.cachedValue = { value };
      return value;
    } catch (err) {
      if (cancelOnAbort && merged.signal?.aborted) {
        void this.cancel().catch(() => {});
      }
      throw err;
    }
  }

  /** Stream the task's chunks via `/queue/stream` (for `stream: true` tasks). */
  stream(opts: JobStreamOptions = {}): AsyncGenerator<ChatStreamEvent> {
    const transport = this.transport;
    const id = this.id;
    return (async function* () {
      const res = await transport.stream("POST", "/api/llm/queue/stream", {
        body: { queueId: id },
        signal: opts.signal,
      });
      yield* streamResponse(res, "native", {
        signal: opts.signal,
        includeRaw: opts.includeRaw,
        idleMs: opts.idleMs ?? 60_000,
      });
    })();
  }

  /** Best-effort server cancel. Safe to call more than once. */
  async cancel(opts: { signal?: AbortSignal } = {}): Promise<void> {
    await this.transport.raw("POST", "/api/llm/queue/cancel", {
      body: { queueId: this.id },
      signal: opts.signal,
    });
  }
}

/** Submit a queued request and return its `Job` handle. */
export async function submitJob<T>(
  transport: Transport,
  path: string,
  body: unknown,
  taskKind: TaskKind,
  signal?: AbortSignal,
  defaultPoll?: PollOptions,
): Promise<Job<T>> {
  const data = await transport.json<{ queueId: string }>("POST", path, {
    body,
    signal,
    retry: "submit",
  });
  return new Job<T>(data.queueId, transport, taskKind, defaultPoll);
}
