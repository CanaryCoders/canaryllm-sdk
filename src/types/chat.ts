import type { ChatProvider, Citation, TokenUsage } from "./common";

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface TextContent {
  type: "text";
  text: string;
}
export interface ImageContent {
  type: "image";
  /** base64-encoded image bytes */
  data: string;
  mimeType?: string;
}
export interface DocumentContent {
  type: "document";
  /** base64-encoded PDF bytes */
  data: string;
  mimeType: "application/pdf";
}
export interface VideoContent {
  type: "video";
  /** base64-encoded video bytes */
  data?: string;
  /** id returned by `video.upload()` */
  fileId?: string;
  mimeType?: string;
}
export type ContentPart =
  | TextContent
  | ImageContent
  | DocumentContent
  | VideoContent;
export type MessageContent = string | ContentPart[];

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
export interface ToolCallDelta {
  index: number;
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
}
export interface Message {
  role: MessageRole;
  content: MessageContent;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}
export type ToolChoice =
  | "auto"
  | "none"
  | "required"
  | { type: "function"; function: { name: string } };

export interface ThinkingMode {
  enabled: boolean;
  budget?: number;
}

export interface WebSearchOptions {
  enabled: boolean;
  maxUses?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  recencyFilter?: "day" | "week" | "month" | "year";
  userLocation?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  xSearch?: boolean;
}

export type ResponseFormat = "text" | "json" | "json_schema";

export interface CompleteParams {
  provider: ChatProvider;
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  responseFormat?: ResponseFormat;
  jsonSchema?: Record<string, unknown>;
  tools?: ToolDefinition[];
  toolChoice?: ToolChoice;
  thinkingMode?: ThinkingMode;
  webSearch?: WebSearchOptions;
  cache?: { enabled?: boolean; ttl?: number };
  tag?: string;
  service?: string;
  /** server-side per-request timeout in ms (1000–300000) */
  timeout?: number;
}

export interface CompletionResult {
  content: string;
  usage: TokenUsage;
  model: string;
  provider: string;
  requestId?: string;
  cached?: boolean;
  finishReason?: string;
  toolCalls?: ToolCall[];
  citations?: Citation[];
  metadata?: Record<string, unknown>;
}

/** Raw chunk shape emitted by the native `/queue/stream` endpoint. */
export interface StreamChunk {
  delta: string;
  usage?: TokenUsage;
  finishReason?: string;
  toolCallDeltas?: ToolCallDelta[];
  metadata?: Record<string, unknown>;
}

/** Normalized streaming event, identical across every wire protocol. */
export type ChatStreamEvent =
  | { type: "start"; raw?: unknown }
  | { type: "text"; delta: string; raw?: unknown }
  | { type: "thinking"; delta: string; raw?: unknown }
  | {
      type: "tool_call";
      index: number;
      id?: string;
      name?: string;
      argsDelta?: string;
      raw?: unknown;
    }
  | { type: "usage"; usage: TokenUsage; raw?: unknown }
  | { type: "done"; finishReason?: string; usage?: TokenUsage; raw?: unknown }
  | { type: "raw"; event?: string; data: unknown };
