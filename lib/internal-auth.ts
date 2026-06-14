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
