import { BaseResource } from "./base";

/** Unauthenticated endpoints. These work even without an API key. */
export class PublicResource extends BaseResource {
  /** All providers with their models and public pricing. */
  models(signal?: AbortSignal): Promise<Record<string, any>> {
    return this.transport.json("GET", "/api/public/models", { signal });
  }

  /** Available voices per provider. */
  voices(signal?: AbortSignal): Promise<Record<string, any>> {
    return this.transport.json("GET", "/api/public/voices", { signal });
  }

  /** A short spoken preview of a voice (base64 audio). */
  voicePreview(
    params: { provider: string; voiceId: string },
    signal?: AbortSignal,
  ): Promise<{ audio: string; mimeType: string; voiceId: string }> {
    return this.transport.json("POST", "/api/public/voices/preview", {
      body: params,
      signal,
    });
  }

  /** The raw OpenAPI specification (YAML). */
  openapi(signal?: AbortSignal): Promise<string> {
    return this.transport.text("GET", "/api/public/openapi.yaml", { signal });
  }
}
