import { anthropicTarget, type CompatTarget, openaiTarget } from "./compat";
import type { FetchLike } from "./core/fetch";
import { Transport } from "./core/http";
import { AgentsResource } from "./resources/agents";
import { AudioResource } from "./resources/audio";
import { ChatResource } from "./resources/chat";
import { ConversationsResource } from "./resources/conversations";
import { DiscoveryResource } from "./resources/discovery";
import { ImagesResource } from "./resources/images";
import { KeysResource } from "./resources/keys";
import { PortalResource } from "./resources/portal";
import { PublicResource } from "./resources/public";
import { QueueResource } from "./resources/queue";
import { RealtimeResource } from "./resources/realtime";
import { UsageResource } from "./resources/usage";
import { VideoResource } from "./resources/video";
import { VisionResource } from "./resources/vision";
import type { PollOptions } from "./types/queue";

export interface CanaryLLMOptions {
  /** API key. Defaults to `process.env.CANARYLLM_API_KEY`. */
  apiKey?: string;
  /** Base URL. Defaults to `https://canaryllm.canarycoders.es`. */
  baseURL?: string;
  /** Send the key as `Authorization: Bearer` (default) or `X-API-Key`. */
  authStyle?: "bearer" | "x-api-key";
  /** Per-request total timeout in ms (default 60000). */
  timeoutMs?: number;
  /** Automatic retries for transient failures (default 2). */
  maxRetries?: number;
  /** Override the fetch implementation (tests, proxies, custom agents). */
  fetch?: FetchLike;
  defaultHeaders?: Record<string, string>;
  /** Default `tag` attached to requests for usage attribution. */
  defaultTag?: string;
  /** Default polling behavior for queued operations. */
  poll?: PollOptions;
}

const DEFAULT_BASE_URL = "https://canaryllm.canarycoders.es";

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env) return process.env[key];
  return undefined;
}

export class CanaryLLM {
  readonly chat: ChatResource;
  readonly queue: QueueResource;
  readonly images: ImagesResource;
  readonly video: VideoResource;
  readonly audio: AudioResource;
  readonly vision: VisionResource;
  readonly conversations: ConversationsResource;
  readonly agents: AgentsResource;
  readonly realtime: RealtimeResource;
  readonly discovery: DiscoveryResource;
  readonly usage: UsageResource;
  readonly portal: PortalResource;
  readonly keys: KeysResource;
  readonly public: PublicResource;

  private readonly transport: Transport;
  private readonly baseURL: string;
  private readonly apiKey?: string;

  constructor(options: CanaryLLMOptions = {}) {
    this.apiKey = options.apiKey ?? readEnv("CANARYLLM_API_KEY");
    this.baseURL =
      options.baseURL ?? readEnv("CANARYLLM_BASE_URL") ?? DEFAULT_BASE_URL;

    this.transport = new Transport({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      authStyle: options.authStyle ?? "bearer",
      timeoutMs: options.timeoutMs ?? 60_000,
      maxRetries: options.maxRetries ?? 2,
      fetch: options.fetch,
      defaultHeaders: options.defaultHeaders,
      defaultTag: options.defaultTag,
    });

    const poll = options.poll;
    this.chat = new ChatResource(this.transport, poll);
    this.queue = new QueueResource(this.transport, poll);
    this.images = new ImagesResource(this.transport, poll);
    this.video = new VideoResource(this.transport, poll);
    this.audio = new AudioResource(this.transport, poll);
    this.vision = new VisionResource(this.transport, poll);
    this.conversations = new ConversationsResource(this.transport, poll);
    this.agents = new AgentsResource(this.transport, poll);
    this.realtime = new RealtimeResource(this.transport, poll);
    this.discovery = new DiscoveryResource(this.transport, poll);
    this.usage = new UsageResource(this.transport, poll);
    this.portal = new PortalResource(this.transport, poll);
    this.keys = new KeysResource(this.transport, poll);
    this.public = new PublicResource(this.transport, poll);
  }

  /** Targets to plug into the official `openai` / `@anthropic-ai/sdk` clients. */
  get compat(): {
    openai: () => CompatTarget;
    anthropic: () => CompatTarget;
  } {
    return {
      openai: () => openaiTarget(this.baseURL, this.apiKey ?? ""),
      anthropic: () => anthropicTarget(this.baseURL, this.apiKey ?? ""),
    };
  }
}
