import "server-only";
import { after } from "next/server";
import {
  getAppOrigin,
  getInternalSecretHeader,
} from "@/lib/internal-auth";

/** Long enough to dispatch the worker request; the worker keeps running after this aborts. */
export const WORKER_TRIGGER_TIMEOUT_MS = 5_000;

/** Fire-and-forget POST to a worker route (separate serverless invocation). */
export function triggerBackgroundWorker(
  request: Request,
  path: string
): void {
  const origin = getAppOrigin(request);
  const secret = getInternalSecretHeader();

  if (!secret["x-internal-secret"]) {
    console.error(
      "[worker] INTERNAL_API_SECRET is not set — background job was not triggered."
    );
    return;
  }

  // Keep the caller alive until the worker request is actually dispatched;
  // a bare `void fetch` can be dropped when the serverless response returns.
  after(() =>
    fetch(`${origin}${path}`, {
      method: "POST",
      headers: {
        ...secret,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(WORKER_TRIGGER_TIMEOUT_MS),
    })
      .then(() => undefined)
      .catch((err) => {
        // Timeout here is expected: the worker keeps running in its own invocation.
        if ((err as Error)?.name !== "TimeoutError") {
          console.error(`[worker] Failed to trigger ${path}:`, err);
        }
      })
  );
}
