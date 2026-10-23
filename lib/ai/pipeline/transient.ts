/** Infra-only transient detection — does not change model/prompt/score behavior. */

export function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    if (err.name === "AbortError" || err.name === "TimeoutError") return true;
  }
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.name === "TimeoutError") return true;
    return /timeout|timed out|ETIMEDOUT|ECONNRESET|ENOTFOUND|429|502|503|504|AbortError/i.test(
      err.message
    );
  }
  return false;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One retry on thrown transient errors (429/5xx/timeout). Non-transient errors
 * are rethrown immediately.
 */
export async function withTransientRetry<T>(
  fn: () => Promise<T>,
  options?: { delayMs?: number }
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isTransientError(err)) throw err;
    await delay(options?.delayMs ?? 400);
    return await fn();
  }
}

/**
 * One retry when the first result looks transient (HTTP 429/5xx) or the first
 * attempt throws a transient error.
 */
export async function withTransientRetryResult<T>(
  fn: () => Promise<T>,
  shouldRetry: (result: T) => boolean,
  delayMs = 400
): Promise<T> {
  try {
    const first = await fn();
    if (!shouldRetry(first)) return first;
    await delay(delayMs);
    return await fn();
  } catch (err) {
    if (!isTransientError(err)) throw err;
    await delay(delayMs);
    return await fn();
  }
}
