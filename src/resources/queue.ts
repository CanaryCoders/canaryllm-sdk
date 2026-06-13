import { Job } from "../core/job";
import type { ChatStreamEvent } from "../types/chat";
import type { JobSnapshot, PollOptions, TaskKind } from "../types/queue";
import { BaseResource } from "./base";

/** Low-level access to the queue by `queueId`, for tasks tracked out of band. */
export class QueueResource extends BaseResource {
  /** Reconstruct a `Job` handle from a known queue id. */
  job<T = unknown>(queueId: string, taskKind: TaskKind = "completion"): Job<T> {
    return new Job<T>(queueId, this.transport, taskKind, this.defaultPoll);
  }

  status(
    queueId: string,
    opts?: { signal?: AbortSignal; allowMissing?: boolean },
  ): Promise<JobSnapshot> {
    return this.job(queueId).status(opts);
  }

  result<T = unknown>(queueId: string, opts?: PollOptions): Promise<T> {
    return this.job<T>(queueId).result(opts);
  }

  stream(
    queueId: string,
    opts?: { signal?: AbortSignal; includeRaw?: boolean; idleMs?: number },
  ): AsyncGenerator<ChatStreamEvent> {
    return this.job(queueId).stream(opts);
  }

  cancel(queueId: string, opts?: { signal?: AbortSignal }): Promise<void> {
    return this.job(queueId).cancel(opts);
  }
}
