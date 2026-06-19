/** Every provider the gateway can route to. */
export type ProviderType =
  | "gemini"
  | "vertex"
  | "openai"
  | "anthropic"
  | "xai"
  | "lmstudio"
  | "ollama"
  | "perplexity"
  | "elevenlabs"
  | "mlxaudio"
  | "vision"
  | "gcvision";

/** Providers that serve text chat / completion. */
export type ChatProvider =
  | "gemini"
  | "vertex"
  | "openai"
  | "anthropic"
  | "xai"
  | "lmstudio"
  | "ollama"
  | "perplexity";

export type ModelCapability =
  | "chat"
  | "vision"
  | "image-generation"
  | "video-generation"
  | "text-to-speech"
  | "speech-to-text"
  | "image-recognition"
  | "face-detection"
  | "web-detection"
  | "conversation"
  | "sound-effect"
  | "music-generation"
  | "dialogue"
  | "realtime-voice"
  | "realtime-translate"
  | "realtime-transcribe"
  | "embeddings"
  | "reasoning";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
  reasoningTokens?: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  provider: string;
  capabilities: ModelCapability[];
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  costPerImage?: number;
  costPerSecond?: number;
  costPerCharacter?: number;
  costPerHour?: number;
  costPerAnalysis?: number;
  costPerMinute?: number;
  higherContextThreshold?: number;
  higherContextInputCostPer1k?: number;
  higherContextOutputCostPer1k?: number;
  deprecated?: boolean;
  shutdownDate?: string;
  replacedBy?: string;
}

export interface VoiceInfo {
  id: string;
  name: string;
  gender?: string;
  accent?: string;
  age?: string;
  language?: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

export interface Citation {
  url?: string;
  title?: string;
  text?: string;
  startIndex?: number;
  endIndex?: number;
}

/** The standard CanaryCoders AI success envelope: `{ success: true, data: T }`. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}
