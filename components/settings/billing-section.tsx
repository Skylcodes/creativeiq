"use client";

import { useState } from "react";
import Link from "next/link";
import { PlanUsagePanel } from "@/components/billing/plan-usage-panel";
import { openBillingPortal } from "@/lib/billing/checkout-client";
import type { AccountUsageSummary } from "@/lib/billing/usage-summary-types";

const STATUS_META: Record<
  string,
  { label: string; tone: string; blurb: string }
> = {
  trialing: {
    label: "Free trial",
    tone: "text-accent-tertiary bg-accent/10 border border-accent/20",
    blurb: "Trial limits apply across all your workspaces.",
  },
  active: {
    label: "Active",
    tone: "text-green-400 bg-green-400/10 border border-green-400/20",
    blurb: "Your subscription is active. Usage below is pooled across all workspaces.",
  },
  payment_failed: {
    label: "Payment failed",
    tone: "text-red-400 bg-red-400/10 border border-red-400/20",
    blurb: "Update your payment method to restore access.",
  },
  paywalled: {
    label: "Inactive",
    tone: "text-red-400 bg-red-400/10 border border-red-400/20",
    blurb: "Upgrade to unlock analyses, briefs, and Creative Director chat.",
  },
};

function statusMetaFor(summary: AccountUsageSummary) {
  if (
    summary.accountStatus === "paywalled" &&
    !summary.hasPaidSubscription
  ) {
    return {
      label: "Trial ended",
      tone: "text-amber-400 bg-amber-400/10 border border-amber-400/20",
      blurb: "You used your free trial allowance. Upgrade to keep running analyses and chat.",
    };
  }

  return STATUS_META[summary.accountStatus] ?? STATUS_META.paywalled;
}

type BillingSectionProps = {
  usageSummary: AccountUsageSummary;
};

export function BillingSection({ usageSummary }: BillingSectionProps) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = statusMetaFor(usageSummary);
  const showTrialCountdown = usageSummary.accountStatus === "trialing";
  const showTrialEnded =
    usageSummary.accountStatus === "paywalled" &&
    !usageSummary.hasPaidSubscription;

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
      <div className="dash-card p-6 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              Billing & plan
            </h2>
            <p className="mt-1 text-sm text-white/55">{meta.blurb}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}
          >
            {meta.label}
          </span>
        </div>

        <div className="mt-6 border-t border-white/[0.08] pt-6">
          <PlanUsagePanel summary={usageSummary} />
        </div>

        {showTrialCountdown && usageSummary.trialDaysLeft != null && (
          <div className="mt-4 rounded-xl border border-accent/15 bg-accent/[0.04] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              Trial remaining
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {usageSummary.trialDaysLeft} day
              {usageSummary.trialDaysLeft === 1 ? "" : "s"} left
            </p>
          </div>
        )}

        {showTrialEnded && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-400">
              Free trial complete
            </p>
            <p className="mt-1 text-sm text-white/55">
              Usage below reflects what you used during your trial. Pick a plan to
              continue.
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-3 border-t border-white/[0.08] pt-5">
          {usageSummary.hasPaidSubscription && (
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
            {usageSummary.accountStatus === "active" ? "Change plan" : "View plans"}
          </Link>
        </div>
      </div>
    </section>
  );
}
