import { BaseResource } from "./base";

export interface KeyInfo {
  keyPrefix: string;
  name?: string;
  permissions: { read: boolean; write: boolean; admin?: boolean };
  rateLimits: { perMinute: number; perDay: number };
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt?: string;
}

export interface KeyValidation {
  success: boolean;
  valid: boolean;
  message?: string;
  data?: unknown;
}

export class KeysResource extends BaseResource {
  /** Info about the key the client is authenticated with. */
  info(signal?: AbortSignal): Promise<KeyInfo> {
    return this.transport.json("GET", "/api/keys/info", { signal });
  }

  /** Validate an API key. Returns `{ valid: false }` rather than throwing. */
  validate(apiKey: string, signal?: AbortSignal): Promise<KeyValidation> {
    return this.transport.json("POST", "/api/keys/validate", {
      body: { apiKey },
      signal,
      unwrap: false,
    });
  }
}
