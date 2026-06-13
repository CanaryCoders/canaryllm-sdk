/**
 * Helpers to point the official OpenAI / Anthropic SDKs at CanaryLLM's
 * drop-in compatible endpoints. Use the `provider/modelId` model-string format
 * (e.g. `"openai/gpt-4o-mini"`, `"anthropic/claude-sonnet-4-5"`).
 *
 * @example
 * import OpenAI from "openai";
 * import { openaiTarget } from "@canarycoders/canaryllm/compat";
 * const oa = new OpenAI(openaiTarget(baseURL, apiKey));
 */
export interface CompatTarget {
  baseURL: string;
  apiKey: string;
  defaultHeaders?: Record<string, string>;
}

function v1(baseURL: string): string {
  return `${baseURL.replace(/\/+$/, "")}/v1`;
}

export function openaiTarget(baseURL: string, apiKey: string): CompatTarget {
  return { baseURL: v1(baseURL), apiKey };
}

export function anthropicTarget(baseURL: string, apiKey: string): CompatTarget {
  return { baseURL: v1(baseURL), apiKey };
}
