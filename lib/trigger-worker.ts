import "server-only";
import { after } from "next/server";
import {
  getAppOrigin,
  getInternalSecretHeader,
} from "@/lib/internal-auth";
import { WORKER_TRIGGER_FETCH_TIMEOUT_MS } from "@/lib/analyses/worker-constants";

export function dispatchWorkerFetch(
  url: string,
  secret: Record<string, string>
): Promise<void> {
  return fetch(url, {
    method: "POST",
    headers: {
      ...secret,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(WORKER_TRIGGER_FETCH_TIMEOUT_MS),
  })
    .then(() => undefined)
    .catch((err) => {
      // Timeout here is expected: the worker keeps running in its own invocation.
      if ((err as Error)?.name !== "TimeoutError") {
        console.error(`[worker] Failed to trigger ${url}:`, err);
      }
    });
}

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

  const url = `${origin}${path}`;
  const task = () => dispatchWorkerFetch(url, secret);

  // Keep the caller alive until the worker request is actually dispatched;
  // a bare `void fetch` can be dropped when the serverless response returns.
  try {
    after(task);
  } catch (err) {
    console.error("[worker] after() unavailable, dispatching inline:", err);
    void task();
  }
}
