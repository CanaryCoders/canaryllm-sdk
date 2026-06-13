export type JobStatus =
  | "queued"
  | "processing"
  | "thinking"
  | "streaming"
  | "completed"
  | "failed"
  | "cancelled"
  | "not_found"
  | "error";

export interface JobSnapshot {
  id: string;
  status: JobStatus;
  /** queue position, present only while `queued` */
  position?: number;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
  provider?: string;
  model?: string;
  error?: { message: string; code?: string; statusCode?: number };
}

/** Drives per-domain default poll timeouts. */
export type TaskKind =
  | "completion"
  | "image"
  | "video"
  | "tts"
  | "stt"
  | "sound-effect"
  | "music"
  | "dialogue"
  | "vision"
  | "embedding";

export interface PollOptions {
  /** first poll delay after submit (default 500ms) */
  initialIntervalMs?: number;
  /** interval growth factor (default 1.5) */
  backoffFactor?: number;
  /** cap on the per-poll interval (default 5000ms) */
  maxIntervalMs?: number;
  /** jitter fraction applied to each interval, 0–1 (default 0.2) */
  jitter?: number;
  /** total wall-clock budget; defaults per task kind */
  maxWaitMs?: number;
  /** fired on every poll while the job is still running */
  onPoll?: (info: {
    status: JobStatus;
    position?: number;
    elapsedMs: number;
  }) => void;
  signal?: AbortSignal;
  /** also fire `POST /queue/cancel` when the signal aborts (default true) */
  cancelServerOnAbort?: boolean;
}
