export type FetchLike = typeof globalThis.fetch;

/** Resolve a fetch implementation: the override, else the global. */
export function resolveFetch(custom?: FetchLike): FetchLike {
  if (custom) return custom;
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }
  throw new Error(
    "No global fetch found. Run on Node >= 18 or Bun, or pass a `fetch` implementation in the client options.",
  );
}

export function detectRuntime(): "bun" | "node" | "unknown" {
  if (typeof (globalThis as { Bun?: unknown }).Bun !== "undefined") return "bun";
  if (
    typeof process !== "undefined" &&
    typeof process.versions?.node === "string"
  ) {
    return "node";
  }
  return "unknown";
}
