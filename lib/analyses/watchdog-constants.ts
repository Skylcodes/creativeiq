/** Client-safe watchdog constants and helpers (no server-only imports). */

// Worker maxDuration is 300s; anything still "processing" after 6 min is dead.
export const ANALYSIS_TIMEOUT_MS = 6 * 60 * 1000;
export const ANALYSIS_TIMEOUT_MESSAGE =
  "Analysis timed out. Please try again.";

export function isTimeoutError(message: string | null | undefined): boolean {
  return message === ANALYSIS_TIMEOUT_MESSAGE;
}
