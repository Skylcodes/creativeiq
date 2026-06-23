"use client";

import { useState } from "react";
import Link from "next/link";
import { useBilling } from "@/components/billing/billing-provider";
import { openBillingPortal } from "@/lib/billing/checkout-client";

const STATUS_META: Record<
  string,
  { label: string; tone: string; blurb: string }
> = {
  trialing: {
    label: "Free trial",
    tone: "text-[#7c3aed] bg-[#7c3aed]/10",
    blurb: "You're on the 14-day free trial.",
  },
  active: {
    label: "Active",
    tone: "text-green-600 bg-green-500/10",
    blurb: "Your subscription is active and in good standing.",
  },
  payment_failed: {
    label: "Payment failed",
    tone: "text-red-600 bg-red-500/10",
    blurb: "Your last payment failed. Update your payment method to restore access.",
  },
  paywalled: {
    label: "Inactive",
    tone: "text-red-600 bg-red-500/10",
    blurb: "Your access is limited. Upgrade to unlock all actions again.",
  },
};

export function BillingSection() {
  const { snapshot } = useBilling();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = STATUS_META[snapshot.status] ?? STATUS_META.paywalled;
  const tierLabel = snapshot.subscriptionTierKey
    ? snapshot.subscriptionTierKey.charAt(0).toUpperCase() +
      snapshot.subscriptionTierKey.slice(1)
    : null;

  async function handlePortal() {
    setWorking(true);
    setError(null);
    const result = await openBillingPortal();
    if (!result.ok) {
      setError(result.error ?? "Could not open billing portal.");
      setWorking(false);
    }
  }

  return (
    <section id="billing" className="scroll-mt-6">
      <div className="premium-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Billing & plan
            </h2>
            <p className="mt-1 text-sm text-text-secondary">{meta.blurb}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}
          >
            {meta.label}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[color:var(--border)] bg-surface-muted px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Current plan
            </p>
            <p className="mt-1 text-sm font-semibold text-text-primary">
              {snapshot.isAdmin ? "Founder (unlimited)" : tierLabel ?? "No active plan"}
            </p>
          </div>
          {snapshot.status === "trialing" && (
            <div className="rounded-xl border border-[color:var(--border)] bg-surface-muted px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Trial remaining
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {snapshot.trialDaysLeft ?? 0} day
                {snapshot.trialDaysLeft === 1 ? "" : "s"} left
              </p>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          {snapshot.hasStripeCustomer && (
            <button
              type="button"
              onClick={handlePortal}
              disabled={working}
              className="btn-outline text-sm disabled:opacity-60"
            >
              {working ? "Opening…" : "Manage billing"}
            </button>
          )}
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-full bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d28d9]"
          >
            {snapshot.status === "active" ? "Change plan" : "View plans"}
          </Link>
        </div>
      </div>
    </section>
  );
}
