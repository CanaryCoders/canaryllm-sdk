import type { ConversationSession } from "../types/conversations";
import type {
  BrokeredCredential,
  CreateRealtimeSessionParams,
  FinalizeRealtimeParams,
  RealtimeSession,
  RealtimeSessionRecord,
} from "../types/realtime";
import { BaseResource } from "./base";

class RealtimeSessionsAPI extends BaseResource {
  /** Mint an ephemeral realtime credential. The response is NOT enveloped. */
  create(
    params: CreateRealtimeSessionParams,
    signal?: AbortSignal,
  ): Promise<RealtimeSession> {
    return this.transport.json("POST", "/api/realtime/sessions", {
      body: params,
      signal,
      retry: "submit",
      unwrap: false,
    });
  }

  async get(id: number, signal?: AbortSignal): Promise<RealtimeSessionRecord> {
    const data = await this.transport.json<{ session: RealtimeSessionRecord }>(
      "GET",
      `/api/realtime/sessions/${id}`,
      { signal },
    );
    return data.session;
  }

  async end(
    id: number,
    params: FinalizeRealtimeParams = {},
    signal?: AbortSignal,
  ): Promise<RealtimeSessionRecord> {
    const data = await this.transport.json<{ session: RealtimeSessionRecord }>(
      "POST",
      `/api/realtime/sessions/${id}/end`,
      { body: params, signal },
    );
    return data.session;
  }
}

export class RealtimeResource extends BaseResource {
  readonly sessions = new RealtimeSessionsAPI(this.transport, this.defaultPoll);
}

/**
 * Normalize a realtime or conversational session into a single credential
 * shape safe to hand to a frontend (only the short-lived secret, never the
 * API key).
 */
export function toBrokeredCredential(
  session: RealtimeSession | ConversationSession,
): BrokeredCredential {
  if ("clientSecret" in session) {
    return {
      kind: "openai-realtime",
      sessionId: session.sessionId,
      token: session.clientSecret,
      url: session.webrtcUrl,
      expiresAt: session.expiresAt,
      expiresInMs: Math.max(0, Date.parse(session.expiresAt) - Date.now()),
    };
  }
  const expiresInMs = session.expiresIn * 1000;
  return {
    kind: "elevenlabs-convai",
    sessionId: session.session.id,
    url: session.signedUrl,
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    expiresInMs,
  };
}
