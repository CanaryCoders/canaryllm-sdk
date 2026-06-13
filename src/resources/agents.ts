import type { SignedUrlParams, SignedUrlResult } from "../types/conversations";
import { BaseResource } from "./base";

export class AgentsResource extends BaseResource {
  /** Mint a short-lived signed URL for an ElevenLabs agent. */
  signedUrl(
    params: SignedUrlParams,
    signal?: AbortSignal,
  ): Promise<SignedUrlResult> {
    return this.transport.json("POST", "/api/agents/signed-url", {
      body: params,
      signal,
      retry: "submit",
    });
  }
}
