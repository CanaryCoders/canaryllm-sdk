import type { Job } from "../core/job";
import type { ImageGenerateParams, ImageGenerationResult } from "../types/media";
import type { PollOptions } from "../types/queue";
import { BaseResource } from "./base";

export class ImagesResource extends BaseResource {
  /** Generate one or more images and wait for the result. */
  generate(
    params: ImageGenerateParams,
    poll?: PollOptions,
  ): Promise<ImageGenerationResult> {
    return this.runQueued<ImageGenerationResult>(
      "/api/llm/generate-image",
      params,
      "image",
      poll,
    );
  }

  /** Submit an image generation and return the `Job` handle. */
  generateJob(
    params: ImageGenerateParams,
    signal?: AbortSignal,
  ): Promise<Job<ImageGenerationResult>> {
    return this.submitQueued<ImageGenerationResult>(
      "/api/llm/generate-image",
      params,
      "image",
      signal,
    );
  }
}
