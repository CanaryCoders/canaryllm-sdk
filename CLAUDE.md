# canaryllm-sdk

Official TypeScript SDK for the CanaryLLM gateway (`@canarycoders/canaryllm`). Targets Node 18+ and Bun, zero runtime dependencies.

## Source of truth

The CanaryLLM server API is the source of truth. This repo mirrors its wire contracts by hand in `src/types/*` and verifies against the published OpenAPI spec (`GET /api/public/openapi.yaml`). The server repo's CLAUDE.md requires updating this SDK in the same change as any API contract change.

When the gateway changes an endpoint, schema, error code, or model: update the matching type in `src/types/*`, the resource method in `src/resources/*`, and run `bun run gen:openapi` to diff against the spec. A breaking contract change is a breaking SDK release.

## Layout

- `src/core/` — transport (`http.ts`), errors, retry, SSE reader, stream adapters, queue poller, `Job` handle.
- `src/resources/` — one class per API domain, all extending `BaseResource`.
- `src/client.ts` — `CanaryLLM`, wires the transport to the resources.
- `src/compat.ts`, `src/realtime-client/` — the `./compat` and `./realtime-client` entry points.
- `src/types/` — hand-written wire types.

## Conventions

- Queued endpoints return a `queueId`; the SDK polls via `pollToResult`. Each queued method has an awaitable form (`generate`) and a handle form (`generateJob` / `submit`).
- Responses are typed casts, not validated. Errors map to the `APIError` hierarchy; branch on `.code`/`.status`.
- Queue submits use `retry: "submit"` (no 5xx retry — non-idempotent). Reads use the full retry policy.

## Commands

```bash
bun test test/unit     # unit tests (mock fetch)
bun run typecheck      # tsc --noEmit
bun run lint
bun run build          # tsup → dist (ESM + CJS + .d.ts)
bun run gen:openapi    # regenerate types from the live spec
```
