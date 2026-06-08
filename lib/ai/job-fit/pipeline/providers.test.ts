/**
 * Gemini provider response handling tests.
 * HTTP 200 with empty candidates should still be logged as a provider failure.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateByPriority, JobFitProviderHttpError } from "./providers";

const input = {
  id: "job-id",
  title: "테스트 공고",
  company: "테스트 회사",
  location: null,
  source: "custom",
  sourceUrl: "https://example.com/job",
};

describe("evaluateByPriority", () => {
  const originalFetch = globalThis.fetch;
  const originalGeminiApiKey = process.env.GEMINI_API_KEY;
  const originalMinInterval = process.env.JOB_FIT_GEMINI_MIN_INTERVAL_MS;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalGeminiApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalGeminiApiKey;
    }
    if (originalMinInterval === undefined) {
      delete process.env.JOB_FIT_GEMINI_MIN_INTERVAL_MS;
    } else {
      process.env.JOB_FIT_GEMINI_MIN_INTERVAL_MS = originalMinInterval;
    }
    vi.restoreAllMocks();
  });

  it("throws a provider error when Gemini returns an empty candidate", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.JOB_FIT_GEMINI_MIN_INTERVAL_MS = "0";
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [{ content: {} }],
            usageMetadata: {
              promptTokenCount: 3026,
              totalTokenCount: 3026,
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          }
        )
    );

    try {
      await evaluateByPriority(input);
      throw new Error("Expected evaluateByPriority to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(JobFitProviderHttpError);
      expect(error).toMatchObject({
        provider: "Gemini",
        status: 200,
      });
      expect((error as JobFitProviderHttpError).detail).toContain(
        "empty candidate content"
      );
      expect((error as JobFitProviderHttpError).detail).toContain(
        "promptTokens=3026"
      );
      expect((error as JobFitProviderHttpError).detail).toContain(
        "totalTokens=3026"
      );
    }
  });
});
