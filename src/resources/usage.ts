import { BaseResource } from "./base";

export interface UsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalPrice?: number;
  [k: string]: unknown;
}

export class UsageResource extends BaseResource {
  /** Current-month usage summary. */
  current(signal?: AbortSignal): Promise<UsageSummary> {
    return this.transport.json("GET", "/api/llm/usage", { signal });
  }
  /** Monthly usage broken down by model/provider. */
  monthly(signal?: AbortSignal): Promise<unknown> {
    return this.transport.json("GET", "/api/llm/usage/monthly", { signal });
  }
  /** Daily usage breakdown. */
  daily(signal?: AbortSignal): Promise<unknown> {
    return this.transport.json("GET", "/api/llm/usage/daily", { signal });
  }
}
