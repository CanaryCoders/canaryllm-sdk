export type RealtimeKind = "voice" | "translate" | "transcribe";

export interface RealtimeTool {
  type: string;
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface CreateRealtimeSessionParams {
  kind: RealtimeKind;
  model?: string;
  sourceLanguage?: string;
  /** required when `kind: "translate"` */
  targetLanguages?: string[];
  voice?: string;
  instructions?: string;
  reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
  tools?: RealtimeTool[];
  maxDurationSeconds?: number;
  metadata?: Record<string, unknown>;
}

/** Minted ephemeral credential to hand to a browser/native client. */
export interface RealtimeSession {
  sessionId: number;
  openaiSessionId: string;
  /** short-lived secret the end client uses to open WebRTC */
  clientSecret: string;
  /** endpoint the end client POSTs its SDP offer to */
  webrtcUrl: string;
  model: string;
  kind: RealtimeKind;
  /** ISO timestamp the credential expires at */
  expiresAt: string;
}

export interface RealtimeSessionRecord {
  id: number;
  kind: RealtimeKind;
  status: string;
  model: string;
  createdAt?: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface FinalizeRealtimeParams {
  durationSeconds?: number;
  inputAudioTokens?: number;
  outputAudioTokens?: number;
  metadata?: Record<string, unknown>;
}

/** Normalized credential for handing to a frontend, across both brokers. */
export interface BrokeredCredential {
  kind: "openai-realtime" | "elevenlabs-convai";
  sessionId: number | string;
  /** OpenAI realtime: the client secret. ElevenLabs: absent (uses `url`). */
  token?: string;
  /** OpenAI realtime: the WebRTC offer URL. ElevenLabs: the signed URL. */
  url: string;
  expiresAt: string;
  expiresInMs: number;
}
