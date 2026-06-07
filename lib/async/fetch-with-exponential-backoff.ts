const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type FetchWithExponentialBackoffOptions = {
  /** Total attempts including the first request. Default 5. */
  maxAttempts?: number;
  /** Initial backoff base in ms (doubled each retry). Default 500. */
  baseDelayMs?: number;
  /** Cap per wait. Default 10_000. */
  maxDelayMs?: number;
  /** Per-attempt request timeout. Default 60_000. */
  timeoutMs?: number;
};

const isRetriableHttpStatus = (status: number): boolean => status === 429 || status >= 500;

export const resolveRetryAfterDelayMs = (
  retryAfter: string | null,
  nowMs = Date.now()
): number | null => {
  const trimmed = retryAfter?.trim();
  if (!trimmed) return null;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) {
    return seconds >= 0 ? seconds * 1000 : null;
  }

  const retryAtMs = Date.parse(trimmed);
  if (Number.isFinite(retryAtMs)) {
    return Math.max(0, retryAtMs - nowMs);
  }

  return null;
};

const resolveRetryDelayMs = (
  response: Response,
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number
): number => {
  const retryAfterDelayMs = resolveRetryAfterDelayMs(response.headers.get("retry-after"));
  if (retryAfterDelayMs !== null) {
    return retryAfterDelayMs;
  }

  const base = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  const jitterFactor = 1 + Math.random() * 0.25;
  return base * jitterFactor;
};

/**
 * Retries on 429, 5xx, and transient fetch failures with exponential backoff and light jitter.
 * Non-retriable HTTP responses are returned as-is for the caller to handle.
 */
export async function fetchWithExponentialBackoff(
  input: URL | RequestInfo,
  init?: RequestInit,
  options?: FetchWithExponentialBackoffOptions
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? 5;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  const maxDelayMs = options?.maxDelayMs ?? 10_000;
  const timeoutMs = options?.timeoutMs ?? 60_000;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const parentSignal = init?.signal;

    const onParentAbort = () => {
      controller.abort(parentSignal?.reason);
    };
    if (parentSignal) {
      if (parentSignal.aborted) {
        controller.abort(parentSignal.reason);
      } else {
        parentSignal.addEventListener("abort", onParentAbort, { once: true });
      }
    }

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener("abort", onParentAbort);

      if (response.ok) {
        return response;
      }

      if (isRetriableHttpStatus(response.status) && attempt < maxAttempts - 1) {
        await sleep(resolveRetryDelayMs(response, attempt, baseDelayMs, maxDelayMs));
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener("abort", onParentAbort);

      if (parentSignal?.aborted) {
        throw error;
      }

      lastError = error;
      if (attempt >= maxAttempts - 1) {
        throw error;
      }

      const base = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const jitterFactor = 1 + Math.random() * 0.25;
      await sleep(base * jitterFactor);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("fetchWithExponentialBackoff exhausted");
}
