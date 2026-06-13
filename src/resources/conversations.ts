import type {
  ConversationSession,
  ConversationSessionRecord,
  ConversationTemplate,
  ConversationTemplateParams,
  ConversationTemplateUpdate,
  CreateConversationSessionParams,
} from "../types/conversations";
import { BaseResource } from "./base";

class TemplatesAPI extends BaseResource {
  create(
    params: ConversationTemplateParams,
    signal?: AbortSignal,
  ): Promise<ConversationTemplate> {
    return this.transport.json("POST", "/api/convagents/templates", {
      body: params,
      signal,
      retry: "submit",
    });
  }

  list(signal?: AbortSignal): Promise<ConversationTemplate[]> {
    return this.transport.json("GET", "/api/convagents/templates", { signal });
  }

  async get(id: number, signal?: AbortSignal): Promise<ConversationTemplate> {
    const data = await this.transport.json<{
      template: ConversationTemplate;
    }>("GET", `/api/convagents/templates/${id}`, { signal });
    return data.template;
  }

  update(
    id: number,
    params: ConversationTemplateUpdate,
    signal?: AbortSignal,
  ): Promise<ConversationTemplate> {
    return this.transport.json("PUT", `/api/convagents/templates/${id}`, {
      body: params,
      signal,
      retry: "submit",
    });
  }

  delete(id: number, signal?: AbortSignal): Promise<void> {
    return this.transport.json("DELETE", `/api/convagents/templates/${id}`, {
      signal,
    });
  }
}

class SessionsAPI extends BaseResource {
  create(
    params: CreateConversationSessionParams,
    signal?: AbortSignal,
  ): Promise<ConversationSession> {
    return this.transport.json("POST", "/api/convagents/sessions", {
      body: params,
      signal,
      retry: "submit",
    });
  }

  list(
    opts: { templateId?: number } = {},
    signal?: AbortSignal,
  ): Promise<ConversationSessionRecord[]> {
    return this.transport.json("GET", "/api/convagents/sessions", {
      query: { templateId: opts.templateId },
      signal,
    });
  }

  async get(
    id: number,
    signal?: AbortSignal,
  ): Promise<ConversationSessionRecord> {
    const data = await this.transport.json<{
      session: ConversationSessionRecord;
    }>("GET", `/api/convagents/sessions/${id}`, { signal });
    return data.session;
  }
}

export class ConversationsResource extends BaseResource {
  readonly templates = new TemplatesAPI(this.transport, this.defaultPoll);
  readonly sessions = new SessionsAPI(this.transport, this.defaultPoll);
}
