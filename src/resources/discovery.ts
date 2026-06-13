import type { ModelInfo, VoiceInfo } from "../types/common";
import { BaseResource } from "./base";

export class DiscoveryResource extends BaseResource {
  async providers(signal?: AbortSignal): Promise<string[]> {
    const data = await this.transport.json<{ providers: string[] }>(
      "GET",
      "/api/llm/providers",
      { signal },
    );
    return data.providers;
  }

  async models(provider: string, signal?: AbortSignal): Promise<ModelInfo[]> {
    const data = await this.transport.json<{ models: ModelInfo[] }>(
      "GET",
      "/api/llm/models",
      { query: { provider }, signal },
    );
    return data.models;
  }

  async voices(provider: string, signal?: AbortSignal): Promise<VoiceInfo[]> {
    const data = await this.transport.json<{ voices: VoiceInfo[] }>(
      "GET",
      "/api/llm/voices",
      { query: { provider }, signal },
    );
    return data.voices;
  }

  capabilities(signal?: AbortSignal): Promise<Record<string, any>> {
    return this.transport.json("GET", "/api/llm/capabilities", { signal });
  }

  concurrency(signal?: AbortSignal): Promise<Record<string, any>> {
    return this.transport.json("GET", "/api/llm/concurrency", { signal });
  }

  concurrencyFor(
    provider: string,
    signal?: AbortSignal,
  ): Promise<Record<string, any>> {
    return this.transport.json(
      "GET",
      `/api/llm/concurrency/${encodeURIComponent(provider)}`,
      { signal },
    );
  }
}
