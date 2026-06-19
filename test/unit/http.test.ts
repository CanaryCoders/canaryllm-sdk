import { describe, expect, test } from "bun:test";
import { AuthenticationError, NotFoundError } from "../../src/core/errors";
import { Transport } from "../../src/core/http";
import { jsonResponse, mockFetch } from "./helpers";

describe("Transport", () => {
  test("unwraps { success, data } envelopes", async () => {
    const { fetch, calls } = mockFetch(() =>
      jsonResponse({ success: true, data: { ok: 1 } }),
    );
    const t = new Transport({
      apiKey: "clk_live_x",
      baseURL: "https://api.test",
      authStyle: "bearer",
      timeoutMs: 1000,
      maxRetries: 0,
      fetch,
    });
    const r = await t.json<{ ok: number }>("GET", "/x");
    expect(r).toEqual({ ok: 1 });
    expect(calls[0]?.headers["authorization"]).toBe("Bearer clk_live_x");
  });

  test("supports the x-api-key auth style", async () => {
    const { fetch, calls } = mockFetch(() =>
      jsonResponse({ success: true, data: {} }),
    );
    const t = new Transport({
      apiKey: "k",
      baseURL: "https://api.test",
      authStyle: "x-api-key",
      timeoutMs: 1000,
      maxRetries: 0,
      fetch,
    });
    await t.json("GET", "/x");
    expect(calls[0]?.headers["x-api-key"]).toBe("k");
  });

  test("throws a typed error on 401", async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse(
        { success: false, error: "no", code: "INVALID_API_KEY" },
        { status: 401 },
      ),
    );
    const t = new Transport({
      baseURL: "https://api.test",
      authStyle: "bearer",
      timeoutMs: 1000,
      maxRetries: 0,
      fetch,
    });
    await expect(t.json("GET", "/x")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });

  test("unwrap:false returns the raw (unenveloped) body", async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse({ sessionId: 1, clientSecret: "s" }),
    );
    const t = new Transport({
      baseURL: "https://api.test",
      authStyle: "bearer",
      timeoutMs: 1000,
      maxRetries: 0,
      fetch,
    });
    const r = await t.json<{ sessionId: number }>("POST", "/realtime", {
      body: {},
      unwrap: false,
    });
    expect(r.sessionId).toBe(1);
  });

  test("injects the default tag into JSON bodies", async () => {
    const { fetch, calls } = mockFetch(() =>
      jsonResponse({ success: true, data: {} }),
    );
    const t = new Transport({
      baseURL: "https://api.test",
      authStyle: "bearer",
      timeoutMs: 1000,
      maxRetries: 0,
      fetch,
      defaultTag: "proj-x",
    });
    await t.json("POST", "/x", { body: { a: 1 } });
    expect(calls[0]?.body).toEqual({ a: 1, tag: "proj-x" });
  });

  test("bytes() returns the raw binary body", async () => {
    const payload = new Uint8Array([1, 2, 3, 4]);
    const { fetch } = mockFetch(
      () =>
        new Response(payload, {
          status: 200,
          headers: { "content-type": "audio/mpeg" },
        }),
    );
    const t = new Transport({
      baseURL: "https://api.test",
      authStyle: "bearer",
      timeoutMs: 1000,
      maxRetries: 0,
      fetch,
    });
    const buf = await t.bytes("GET", "/audio");
    expect(new Uint8Array(buf)).toEqual(payload);
  });

  test("bytes() throws a typed error on 404", async () => {
    const { fetch } = mockFetch(() =>
      jsonResponse(
        { success: false, error: "gone", code: "NOT_FOUND" },
        { status: 404 },
      ),
    );
    const t = new Transport({
      baseURL: "https://api.test",
      authStyle: "bearer",
      timeoutMs: 1000,
      maxRetries: 0,
      fetch,
    });
    await expect(t.bytes("GET", "/audio")).rejects.toBeInstanceOf(NotFoundError);
  });
});
