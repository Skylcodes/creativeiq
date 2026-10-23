/** Errors that are safe to retry once without changing model inputs or scoring. */
const TRANSIENT_MESSAGE =
  /timeout|timed out|ETIMEDOUT|AbortError|ECONNRESET|EAI_AGAIN|ENOTFOUND|ECONNREFUSED|429|rate limit|overloaded|529|503|502|500|Service Unavailable|Internal Server Error/i;

export function isTransientError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    status?: number;
    statusCode?: number;
    message?: string;
    name?: string;
  };
  const status = e.status ?? e.statusCode;
  if (status === 429 || (typeof status === "number" && status >= 500)) {
    return true;
  }
  const text = `${e.name ?? ""} ${e.message ?? ""}`;
  return TRANSIENT_MESSAGE.test(text);
}

const DEFAULT_RETRY_DELAY_MS = 1_200;
/** Do not retry a call that already burned most of the worker budget. */
const MAX_ELAPSED_FOR_RETRY_MS = 45_000;

export async function withTransientRetry<T>(
  fn: () => Promise<T>,
  options?: { delayMs?: number }
): Promise<T> {
  const started = Date.now();
  try {
    return await fn();
  } catch (first) {
    if (!isTransientError(first)) throw first;
    if (Date.now() - started > MAX_ELAPSED_FOR_RETRY_MS) throw first;
    await new Promise((r) => setTimeout(r, options?.delayMs ?? DEFAULT_RETRY_DELAY_MS));
    return await fn();
  }
}
