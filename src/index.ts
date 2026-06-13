import { CanaryLLM } from "./client";

export { CanaryLLM };
export default CanaryLLM;
export type { CanaryLLMOptions } from "./client";

// Errors
export {
  APIError,
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  UnprocessableEntityError,
} from "./core/errors";

// Queue handle
export { Job } from "./core/job";
export type { JobStreamOptions } from "./core/job";

// Streaming
export type {
  StreamAdapterOptions,
  StreamProtocol,
} from "./core/stream-adapters";

// Broker helper
export { toBrokeredCredential } from "./resources/realtime";

// Compat helpers
export { anthropicTarget, openaiTarget, type CompatTarget } from "./compat";

// Resource option/result types
export type { ChatStreamOptions } from "./resources/chat";
export type { KeyInfo, KeyValidation } from "./resources/keys";
export type { PortalPeriod } from "./resources/portal";
export type { UsageSummary } from "./resources/usage";
export type { VideoUploadOptions } from "./resources/video";

// All wire types
export * from "./types";
