import "server-only";

/** Validates the internal secret used for fire-and-forget worker routes. */
export function isValidInternalSecret(request: Request): boolean {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("x-internal-secret") === secret;
}

export function getInternalSecretHeader(): Record<string, string> {
  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) return {};
  return { "x-internal-secret": secret };
}

export function getAppOrigin(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.trim()}`
      : undefined) ||
    new URL(request.url).origin
  );
}

/**
 * Origin for server-to-server worker triggers (run + heal re-trigger).
 * Preview/dev must hit this deployment — NEXT_PUBLIC_APP_URL is the
 * production host in every Vercel environment.
 */
export function getInternalWorkerOrigin(request: Request): string {
  if (process.env.VERCEL_ENV !== "production") {
    const vercelUrl = process.env.VERCEL_URL?.trim();
    if (vercelUrl) {
      return vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://")
        ? vercelUrl.replace(/\/$/, "")
        : `https://${vercelUrl}`;
    }
    return new URL(request.url).origin;
  }
  return getAppOrigin(request);
}

/**
 * Headers for internal worker POSTs. Includes the shared INTERNAL_API_SECRET
 * and, when present, Vercel's automation bypass so Deployment Protection
 * does not 401 the server-to-server call on preview.
 *
 * If preview protection is on and VERCEL_AUTOMATION_BYPASS_SECRET is unset,
 * enable Protection Bypass for Automation on the Vercel project (code cannot
 * invent that secret). Do not change project env vars from this PR.
 */
export function getInternalWorkerHeaders(): Record<string, string> {
  const headers: Record<string, string> = { ...getInternalSecretHeader() };
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
  }
  return headers;
}
