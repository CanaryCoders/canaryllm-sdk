import type { Job } from "../core/job";
import type {
  VideoGenerateParams,
  VideoGenerationResult,
  VideoUploadResult,
} from "../types/media";
import type { PollOptions } from "../types/queue";
import { BaseResource } from "./base";

export interface VideoUploadOptions {
  filename?: string;
  mimeType?: string;
  signal?: AbortSignal;
}

export class VideoResource extends BaseResource {
  generate(
    params: VideoGenerateParams,
    poll?: PollOptions,
  ): Promise<VideoGenerationResult> {
    return this.runQueued<VideoGenerationResult>(
      "/api/llm/generate-video",
      params,
      "video",
      poll,
    );
  }

  generateJob(
    params: VideoGenerateParams,
    signal?: AbortSignal,
  ): Promise<Job<VideoGenerationResult>> {
    return this.submitQueued<VideoGenerationResult>(
      "/api/llm/generate-video",
      params,
      "video",
      signal,
    );
  }

  /** Upload a seed video for image/video-to-video; returns a `fileId`. */
  async upload(
    file: Blob | Uint8Array | ArrayBuffer,
    opts: VideoUploadOptions = {},
  ): Promise<VideoUploadResult> {
    const form = new FormData();
    const blob =
      file instanceof Blob
        ? file
        : new Blob([file as BlobPart], { type: opts.mimeType });
    form.append("video", blob, opts.filename ?? "video");
    return this.transport.json<VideoUploadResult>(
      "POST",
      "/api/llm/upload-video",
      { body: form, signal: opts.signal, retry: "submit" },
    );
  }
}
