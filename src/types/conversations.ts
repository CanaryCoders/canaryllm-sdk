import type { ChatProvider } from "./common";

export type ConversationTemplateType = "interview" | "conversation";

export interface ConversationQuestion {
  question: string;
  context?: string;
  isRequired?: boolean;
}
export interface ConversationVoiceSettings {
  stability?: number;
  speed?: number;
  similarityBoost?: number;
}
export interface ConversationTool {
  name: string;
  description?: string;
}

export interface ConversationTemplateParams {
  name: string;
  type: ConversationTemplateType;
  systemPrompt: string;
  description?: string;
  firstMessage?: string;
  voiceId?: string;
  voiceModel?: string;
  voiceSettings?: ConversationVoiceSettings;
  language?: string;
  languagePresets?: Record<string, { firstMessage?: string }>;
  llmProvider?: ChatProvider;
  llmModel?: string;
  clientWebhookUrl?: string;
  webhookSecret?: string;
  maxDurationSeconds?: number;
  tag?: string;
  questions?: ConversationQuestion[];
  tools?: ConversationTool[];
}
export type ConversationTemplateUpdate = Partial<ConversationTemplateParams>;

export interface ConversationTemplate extends ConversationTemplateParams {
  id: number;
  agentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationSessionRecord {
  id: number;
  templateId: number;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  completedAt?: string;
}
export interface CreateConversationSessionParams {
  templateId: number;
  metadata?: Record<string, unknown>;
  textOnly?: boolean;
}
export interface ConversationSession {
  session: ConversationSessionRecord;
  signedUrl: string;
  /** seconds until the signed URL expires (≈900) */
  expiresIn: number;
  textOnly: boolean;
}

export interface SignedUrlParams {
  agentId: string;
  sessionId?: number;
}
export interface SignedUrlResult {
  signedUrl: string;
  expiresIn: number;
  sessionId?: number;
}
