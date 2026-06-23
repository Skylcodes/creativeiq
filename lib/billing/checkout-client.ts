"use client";

import { ACCOUNT_BLOCKED_CODE, type AccountBlockedPayload } from "@/lib/billing/account-types";

/**
 * Kicks off Stripe Checkout for a tier + interval. Redirects the browser to
 * Stripe's hosted page. If the user isn't signed in, sends them to sign-up.
 */
export async function startCheckout(
  tierKey: string,
  interval: "month" | "year"
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tierKey, interval }),
  });

  if (res.status === 401) {
    window.location.href = `/sign-up?redirectTo=${encodeURIComponent("/pricing")}`;
    return { ok: false };
  }

  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };

  if (res.ok && data.url) {
    window.location.href = data.url;
    return { ok: true };
  }

  return { ok: false, error: data.error ?? "Could not start checkout." };
}

/** Opens the Stripe Customer Portal (manage payment, plans, invoices, cancel). */
export async function openBillingPortal(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };

  if (res.ok && data.url) {
    window.location.href = data.url;
    return { ok: true };
  }

  return { ok: false, error: data.error ?? "Could not open billing portal." };
}

/** Type guard: did a gated API route return the 402 account-blocked payload? */
export function isAccountBlocked(payload: unknown): payload is AccountBlockedPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { code?: string }).code === ACCOUNT_BLOCKED_CODE
  );
}
