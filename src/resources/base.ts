import type { Transport } from "../core/http";
import { submitJob } from "../core/job";
import type { Job } from "../core/job";
import type { PollOptions, TaskKind } from "../types/queue";

export class BaseResource {
  protected readonly transport: Transport;
  protected readonly defaultPoll?: PollOptions;

  constructor(transport: Transport, defaultPoll?: PollOptions) {
    this.transport = transport;
    this.defaultPoll = defaultPoll;
  }

  protected submitQueued<T>(
    path: string,
    body: unknown,
    kind: TaskKind,
    signal?: AbortSignal,
  ): Promise<Job<T>> {
    return submitJob<T>(this.transport, path, body, kind, signal, this.defaultPoll);
  }

  protected async runQueued<T>(
    path: string,
    body: unknown,
    kind: TaskKind,
    poll?: PollOptions,
  ): Promise<T> {
    const job = await this.submitQueued<T>(path, body, kind, poll?.signal);
    return job.result(poll);
  }
}
