import type { ChatStreamEvent, StreamChunk } from "../types/chat";
import type { TokenUsage } from "../types/common";
import { APIError, streamError } from "./errors";
import { iterateSSE, type SSEFrame, type SSEOptions } from "./sse";

export type StreamProtocol = "native" | "openai" | "anthropic" | "responses";

export interface StreamAdapterOptions extends SSEOptions {
  /** attach the source payload as `raw` on each event (off by default) */
  includeRaw?: boolean;
}

function tryParse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

/** Turn a streaming Response into normalized chat events. */
export function streamResponse(
  response: Response,
  protocol: StreamProtocol,
  options: StreamAdapterOptions = {},
): AsyncGenerator<ChatStreamEvent> {
  if (!response.body) {
    throw new APIError("Response has no body to stream", {
      status: response.status,
    });
  }
  const frames = iterateSSE(response.body, options);
  const includeRaw = options.includeRaw ?? false;
  switch (protocol) {
    case "openai":
      return openAIAdapter(frames, includeRaw);
    case "anthropic":
      return anthropicAdapter(frames, includeRaw);
    case "responses":
      return responsesAdapter(frames, includeRaw);
    case "native":
    default:
      return nativeQueueAdapter(frames, includeRaw);
  }
}

export async function* nativeQueueAdapter(
  frames: AsyncIterable<SSEFrame>,
  includeRaw: boolean,
): AsyncGenerator<ChatStreamEvent> {
  const raw = (v: unknown) => (includeRaw ? v : undefined);
  let lastUsage: TokenUsage | undefined;
  let lastFinish: string | undefined;

  for await (const frame of frames) {
    switch (frame.event) {
      case "start":
        yield { type: "start", raw: raw(frame.data) };
        break;
      case "error":
        throw streamError(tryParse(frame.data));
      case "done":
        yield { type: "done", finishReason: lastFinish, usage: lastUsage };
        return;
      case "chunk": {
        const chunk = tryParse(frame.data) as StreamChunk | undefined;
        if (!chunk) break;
        if (chunk.usage) {
          lastUsage = chunk.usage;
          yield { type: "usage", usage: chunk.usage, raw: raw(chunk) };
        }
        if (chunk.finishReason) lastFinish = chunk.finishReason;
        if (chunk.toolCallDeltas) {
          for (const d of chunk.toolCallDeltas) {
            yield {
              type: "tool_call",
              index: d.index,
              id: d.id,
              name: d.function?.name,
              argsDelta: d.function?.arguments,
              raw: raw(d),
            };
          }
        }
        if (chunk.delta) {
          const isThinking = Boolean(
            (chunk.metadata as { isThinking?: boolean } | undefined)?.isThinking,
          );
          yield isThinking
            ? { type: "thinking", delta: chunk.delta, raw: raw(chunk) }
            : { type: "text", delta: chunk.delta, raw: raw(chunk) };
        }
        break;
      }
    }
  }
  yield { type: "done", finishReason: lastFinish, usage: lastUsage };
}

export async function* openAIAdapter(
  frames: AsyncIterable<SSEFrame>,
  includeRaw: boolean,
): AsyncGenerator<ChatStreamEvent> {
  const raw = (v: unknown) => (includeRaw ? v : undefined);
  let started = false;
  let lastUsage: TokenUsage | undefined;
  let lastFinish: string | undefined;

  for await (const frame of frames) {
    const data = frame.data.trim();
    if (data === "[DONE]") {
      yield { type: "done", finishReason: lastFinish, usage: lastUsage };
      return;
    }
    const chunk = tryParse(data) as Record<string, any> | undefined;
    if (!chunk) continue;
    if (chunk.error) throw streamError(chunk);
    if (!started) {
      started = true;
      yield { type: "start", raw: raw(chunk) };
    }
    const choice = chunk.choices?.[0];
    if (choice) {
      const delta = choice.delta ?? {};
      if (delta.reasoning_content) {
        yield { type: "thinking", delta: delta.reasoning_content, raw: raw(chunk) };
      }
      if (typeof delta.content === "string" && delta.content) {
        yield { type: "text", delta: delta.content, raw: raw(chunk) };
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          yield {
            type: "tool_call",
            index: tc.index ?? 0,
            id: tc.id,
            name: tc.function?.name,
            argsDelta: tc.function?.arguments,
            raw: raw(tc),
          };
        }
      }
      if (choice.finish_reason) lastFinish = choice.finish_reason;
    }
    if (chunk.usage) {
      lastUsage = mapOpenAIUsage(chunk.usage);
      yield { type: "usage", usage: lastUsage, raw: raw(chunk) };
    }
  }
  yield { type: "done", finishReason: lastFinish, usage: lastUsage };
}

export async function* anthropicAdapter(
  frames: AsyncIterable<SSEFrame>,
  includeRaw: boolean,
): AsyncGenerator<ChatStreamEvent> {
  const raw = (v: unknown) => (includeRaw ? v : undefined);
  let lastUsage: TokenUsage | undefined;
  let lastFinish: string | undefined;

  for await (const frame of frames) {
    if (frame.event === "ping") continue;
    const data = tryParse(frame.data) as Record<string, any> | undefined;
    if (frame.event === "error") {
      throw streamError(data ?? { error: { message: "stream error" } });
    }
    switch (frame.event) {
      case "message_start":
        yield { type: "start", raw: raw(data) };
        break;
      case "content_block_start": {
        const cb = data?.content_block;
        if (cb?.type === "tool_use") {
          yield {
            type: "tool_call",
            index: data?.index ?? 0,
            id: cb.id,
            name: cb.name,
            raw: raw(data),
          };
        }
        break;
      }
      case "content_block_delta": {
        const d = data?.delta;
        if (d?.type === "text_delta" && d.text) {
          yield { type: "text", delta: d.text, raw: raw(data) };
        } else if (d?.type === "thinking_delta" && d.thinking) {
          yield { type: "thinking", delta: d.thinking, raw: raw(data) };
        } else if (d?.type === "input_json_delta" && d.partial_json) {
          yield {
            type: "tool_call",
            index: data?.index ?? 0,
            argsDelta: d.partial_json,
            raw: raw(data),
          };
        }
        break;
      }
      case "message_delta":
        if (data?.delta?.stop_reason) lastFinish = data.delta.stop_reason;
        if (data?.usage) lastUsage = mapAnthropicUsage(data.usage);
        break;
      case "message_stop":
        yield { type: "done", finishReason: lastFinish, usage: lastUsage };
        return;
    }
  }
  yield { type: "done", finishReason: lastFinish, usage: lastUsage };
}

export async function* responsesAdapter(
  frames: AsyncIterable<SSEFrame>,
  includeRaw: boolean,
): AsyncGenerator<ChatStreamEvent> {
  const raw = (v: unknown) => (includeRaw ? v : undefined);
  let started = false;
  let lastUsage: TokenUsage | undefined;

  for await (const frame of frames) {
    const data = tryParse(frame.data) as Record<string, any> | undefined;
    if (frame.event === "error") throw streamError(data ?? {});
    switch (frame.event) {
      case "response.created":
      case "response.in_progress":
        if (!started) {
          started = true;
          yield { type: "start", raw: raw(data) };
        }
        break;
      case "response.output_text.delta":
        if (typeof data?.delta === "string") {
          yield { type: "text", delta: data.delta, raw: raw(data) };
        }
        break;
      case "response.reasoning_summary_text.delta":
      case "response.reasoning_text.delta":
        if (typeof data?.delta === "string") {
          yield { type: "thinking", delta: data.delta, raw: raw(data) };
        }
        break;
      case "response.function_call_arguments.delta":
        yield {
          type: "tool_call",
          index: data?.output_index ?? 0,
          argsDelta: typeof data?.delta === "string" ? data.delta : undefined,
          raw: raw(data),
        };
        break;
      case "response.completed":
        if (data?.response?.usage) lastUsage = mapResponsesUsage(data.response.usage);
        yield { type: "done", finishReason: "stop", usage: lastUsage };
        return;
      case "response.failed":
        throw streamError(
          data?.response?.error ? { error: data.response.error } : {},
        );
      default:
        yield { type: "raw", event: frame.event, data };
    }
  }
  yield { type: "done", usage: lastUsage };
}

function mapOpenAIUsage(u: Record<string, any>): TokenUsage {
  const input = u.prompt_tokens ?? 0;
  const output = u.completion_tokens ?? 0;
  return {
    inputTokens: input,
    outputTokens: output,
    totalTokens: u.total_tokens ?? input + output,
    cachedTokens: u.prompt_tokens_details?.cached_tokens,
    reasoningTokens: u.completion_tokens_details?.reasoning_tokens,
  };
}

function mapAnthropicUsage(u: Record<string, any>): TokenUsage {
  const input = u.input_tokens ?? 0;
  const output = u.output_tokens ?? 0;
  return {
    inputTokens: input,
    outputTokens: output,
    totalTokens: input + output,
    cachedTokens: u.cache_read_input_tokens,
  };
}

function mapResponsesUsage(u: Record<string, any>): TokenUsage {
  const input = u.input_tokens ?? 0;
  const output = u.output_tokens ?? 0;
  return {
    inputTokens: input,
    outputTokens: output,
    totalTokens: u.total_tokens ?? input + output,
    cachedTokens: u.input_tokens_details?.cached_tokens,
    reasoningTokens: u.output_tokens_details?.reasoning_tokens,
  };
}
