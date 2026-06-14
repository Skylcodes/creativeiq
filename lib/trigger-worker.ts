import "server-only";
import {
  getAppOrigin,
  getInternalSecretHeader,
} from "@/lib/internal-auth";

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

  void fetch(`${origin}${path}`, {
    method: "POST",
    headers: {
      ...secret,
      "Content-Type": "application/json",
    },
  }).catch((err) => {
    console.error(`[worker] Failed to trigger ${path}:`, err);
  });
}
