import { submitJob } from "../core/job";
import type { Job } from "../core/job";
import type {
  ChatStreamEvent,
  CompleteParams,
  CompletionResult,
} from "../types/chat";
import type { PollOptions } from "../types/queue";
import { BaseResource } from "./base";

export interface ChatStreamOptions {
  signal?: AbortSignal;
  includeRaw?: boolean;
}

export class ChatResource extends BaseResource {
  /** Submit a completion and poll until the final result is ready. */
  complete(params: CompleteParams, poll?: PollOptions): Promise<CompletionResult> {
    return this.runQueued<CompletionResult>(
      "/api/llm/complete",
      params,
      "completion",
      poll,
    );
  }

  /** Submit a completion and return the `Job` handle without waiting. */
  submit(
    params: CompleteParams,
    signal?: AbortSignal,
  ): Promise<Job<CompletionResult>> {
    return this.submitQueued<CompletionResult>(
      "/api/llm/complete",
      params,
      "completion",
      signal,
    );
  }

  /** Stream a completion as normalized chat events. */
  stream(
    params: CompleteParams,
    opts: ChatStreamOptions = {},
  ): AsyncGenerator<ChatStreamEvent> {
    const transport = this.transport;
    const defaultPoll = this.defaultPoll;
    return (async function* () {
      const job = await submitJob<CompletionResult>(
        transport,
        "/api/llm/complete",
        { ...params, stream: true },
        "completion",
        opts.signal,
        defaultPoll,
      );
      yield* job.stream({ signal: opts.signal, includeRaw: opts.includeRaw });
    })();
  }
}
