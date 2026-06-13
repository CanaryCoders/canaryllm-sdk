import type { Job } from "../core/job";
import type { PollOptions } from "../types/queue";
import type {
  AutoLabelParams,
  AutoLabelResult,
  AutoTrainParams,
  DetectParams,
  FaceDetectionResult,
  FaceDetectParams,
  ImageRecognitionResult,
  TrainParams,
  TrainingJob,
  VisionModel,
  WebDetectionResult,
  WebDetectParams,
  ZeroShotDetectParams,
} from "../types/vision";
import { BaseResource } from "./base";

export class VisionResource extends BaseResource {
  detect(
    params: DetectParams,
    poll?: PollOptions,
  ): Promise<ImageRecognitionResult> {
    return this.runQueued("/api/vision/detect", params, "vision", poll);
  }
  detectJob(
    params: DetectParams,
    signal?: AbortSignal,
  ): Promise<Job<ImageRecognitionResult>> {
    return this.submitQueued("/api/vision/detect", params, "vision", signal);
  }

  zeroShot(
    params: ZeroShotDetectParams,
    poll?: PollOptions,
  ): Promise<ImageRecognitionResult> {
    return this.runQueued(
      "/api/vision/detect/zero-shot",
      params,
      "vision",
      poll,
    );
  }
  zeroShotJob(
    params: ZeroShotDetectParams,
    signal?: AbortSignal,
  ): Promise<Job<ImageRecognitionResult>> {
    return this.submitQueued(
      "/api/vision/detect/zero-shot",
      params,
      "vision",
      signal,
    );
  }

  faces(
    params: FaceDetectParams,
    poll?: PollOptions,
  ): Promise<FaceDetectionResult> {
    return this.runQueued("/api/vision/detect/faces", params, "vision", poll);
  }
  facesJob(
    params: FaceDetectParams,
    signal?: AbortSignal,
  ): Promise<Job<FaceDetectionResult>> {
    return this.submitQueued(
      "/api/vision/detect/faces",
      params,
      "vision",
      signal,
    );
  }

  web(
    params: WebDetectParams,
    poll?: PollOptions,
  ): Promise<WebDetectionResult> {
    return this.runQueued("/api/vision/detect/web", params, "vision", poll);
  }
  webJob(
    params: WebDetectParams,
    signal?: AbortSignal,
  ): Promise<Job<WebDetectionResult>> {
    return this.submitQueued("/api/vision/detect/web", params, "vision", signal);
  }

  autoLabel(
    params: AutoLabelParams,
    poll?: PollOptions,
  ): Promise<AutoLabelResult> {
    return this.runQueued("/api/vision/auto-label", params, "vision", poll);
  }
  autoLabelJob(
    params: AutoLabelParams,
    signal?: AbortSignal,
  ): Promise<Job<AutoLabelResult>> {
    return this.submitQueued("/api/vision/auto-label", params, "vision", signal);
  }

  autoTrain(
    params: AutoTrainParams,
    poll?: PollOptions,
  ): Promise<TrainingJob> {
    return this.runQueued("/api/vision/auto-train", params, "vision", poll);
  }
  autoTrainJob(
    params: AutoTrainParams,
    signal?: AbortSignal,
  ): Promise<Job<TrainingJob>> {
    return this.submitQueued("/api/vision/auto-train", params, "vision", signal);
  }

  /** Start a dataset training run (synchronous; returns a job record). */
  train(params: TrainParams, signal?: AbortSignal): Promise<TrainingJob> {
    return this.transport.json<TrainingJob>("POST", "/api/vision/train", {
      body: params,
      signal,
      retry: "submit",
    });
  }
  getTraining(jobId: string, signal?: AbortSignal): Promise<TrainingJob> {
    return this.transport.json<TrainingJob>(
      "GET",
      `/api/vision/train/${encodeURIComponent(jobId)}`,
      { signal },
    );
  }
  listTraining(signal?: AbortSignal): Promise<TrainingJob[]> {
    return this.transport.json<TrainingJob[]>("GET", "/api/vision/train", {
      signal,
    });
  }

  models(signal?: AbortSignal): Promise<VisionModel[]> {
    return this.transport.json<VisionModel[]>("GET", "/api/vision/models", {
      signal,
    });
  }
  deleteModel(
    modelId: string,
    signal?: AbortSignal,
  ): Promise<{ deleted: boolean; modelId: string }> {
    return this.transport.json(
      "DELETE",
      `/api/vision/models/${encodeURIComponent(modelId)}`,
      { signal },
    );
  }
}
