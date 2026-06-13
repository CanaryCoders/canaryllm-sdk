import type { Job } from "../core/job";
import type { EmbeddingParams, EmbeddingResult } from "../types/media";
import type { PollOptions } from "../types/queue";
import { BaseResource } from "./base";

export class EmbeddingsResource extends BaseResource {
  /**
   * Embed one or more text inputs into vectors via a local embedding model
   * (LM Studio). Submits to the queue and resolves with the vectors. Content is
   * processed transiently by the gateway and never stored — intended for
   * customer-side RAG ingestion and retrieval.
   */
  create(params: EmbeddingParams, poll?: PollOptions): Promise<EmbeddingResult> {
    return this.runQueued<EmbeddingResult>(
      "/api/llm/embeddings",
      params,
      "embedding",
      poll,
    );
  }

  /** Handle form: returns a {@link Job} you can poll or cancel yourself. */
  createJob(
    params: EmbeddingParams,
    signal?: AbortSignal,
  ): Promise<Job<EmbeddingResult>> {
    return this.submitQueued<EmbeddingResult>(
      "/api/llm/embeddings",
      params,
      "embedding",
      signal,
    );
  }
}
