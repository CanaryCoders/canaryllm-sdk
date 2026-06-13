import { BaseResource } from "./base";

export interface PortalPeriod {
  year?: number;
  month?: number;
}

export class PortalResource extends BaseResource {
  info(signal?: AbortSignal): Promise<Record<string, unknown>> {
    return this.transport.json("GET", "/api/portal/info", { signal });
  }

  overview(
    period: PortalPeriod = {},
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    return this.transport.json("GET", "/api/portal/overview", {
      query: { year: period.year, month: period.month },
      signal,
    });
  }

  usageDaily(
    period: PortalPeriod = {},
    signal?: AbortSignal,
  ): Promise<unknown[]> {
    return this.transport.json("GET", "/api/portal/usage/daily", {
      query: { year: period.year, month: period.month },
      signal,
    });
  }

  usageByModel(
    period: PortalPeriod = {},
    signal?: AbortSignal,
  ): Promise<unknown[]> {
    return this.transport.json("GET", "/api/portal/usage/by-model", {
      query: { year: period.year, month: period.month },
      signal,
    });
  }

  /** Export a month of usage as CSV text. */
  exportUsage(
    params: { month: number; year: number },
    signal?: AbortSignal,
  ): Promise<string> {
    return this.transport.text("GET", "/api/portal/export/usage", {
      query: { month: params.month, year: params.year },
      signal,
    });
  }
}
