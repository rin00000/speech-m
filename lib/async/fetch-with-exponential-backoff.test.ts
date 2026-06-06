import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchWithExponentialBackoff,
  resolveRetryAfterDelayMs,
} from "./fetch-with-exponential-backoff";

const fastRetry = {
  maxAttempts: 5,
  baseDelayMs: 0,
  maxDelayMs: 0,
  timeoutMs: 5000,
} as const;

describe("fetchWithExponentialBackoff", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns 200 after two 503 responses", async () => {
    let n = 0;
    globalThis.fetch = vi.fn(async () => {
      n += 1;
      if (n <= 2) {
        return new Response(null, { status: 503 });
      }
      return new Response("ok", { status: 200 });
    });

    const res = await fetchWithExponentialBackoff("https://example.com", undefined, fastRetry);
    expect(res.ok).toBe(true);
    expect(await res.text()).toBe("ok");
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("returns 200 after 429", async () => {
    let n = 0;
    globalThis.fetch = vi.fn(async () => {
      n += 1;
      if (n === 1) {
        return new Response(null, { status: 429 });
      }
      return new Response("ok", { status: 200 });
    });

    const res = await fetchWithExponentialBackoff("https://example.com", undefined, fastRetry);
    expect(res.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 401", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 401 }));

    const res = await fetchWithExponentialBackoff("https://example.com", undefined, fastRetry);
    expect(res.status).toBe(401);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("retries after fetch throws then succeeds", async () => {
    let n = 0;
    globalThis.fetch = vi.fn(async () => {
      n += 1;
      if (n === 1) {
        throw new TypeError("network failed");
      }
      return new Response("ok", { status: 200 });
    });

    const res = await fetchWithExponentialBackoff("https://example.com", undefined, fastRetry);
    expect(res.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("returns last non-ok when retries exhausted", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 503 }));

    const res = await fetchWithExponentialBackoff("https://example.com", undefined, {
      ...fastRetry,
      maxAttempts: 3,
    });
    expect(res.status).toBe(503);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });
});

describe("resolveRetryAfterDelayMs", () => {
  it("parses second-based Retry-After values", () => {
    expect(resolveRetryAfterDelayMs("2")).toBe(2000);
    expect(resolveRetryAfterDelayMs("0")).toBe(0);
  });

  it("parses HTTP-date Retry-After values", () => {
    const nowMs = Date.parse("Sat, 06 Jun 2026 00:00:00 GMT");
    const retryAt = "Sat, 06 Jun 2026 00:00:03 GMT";

    expect(resolveRetryAfterDelayMs(retryAt, nowMs)).toBe(3000);
  });

  it("ignores invalid Retry-After values", () => {
    expect(resolveRetryAfterDelayMs(null)).toBeNull();
    expect(resolveRetryAfterDelayMs("soon")).toBeNull();
    expect(resolveRetryAfterDelayMs("-1")).toBeNull();
  });
});
