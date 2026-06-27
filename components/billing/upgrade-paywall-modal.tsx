"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PaywallPlanCards } from "@/components/billing/paywall-plan-cards";
import type { SubscriptionTier } from "@/components/admin/types";
import { openBillingPortal } from "@/lib/billing/checkout-client";
import type {
  AccountSnapshot,
  ActionFeature,
  BlockReason,
} from "@/lib/billing/account-types";
import type { AccountUsageSummary, UsageFeatureRow } from "@/lib/billing/usage-summary-types";
import { createClient } from "@/lib/supabase/client";

type ModalState = { reason: BlockReason; feature?: ActionFeature } | null;

const UPGRADE_BENEFITS = [
  "7-agent funnel stress tests",
  "Variant A/B comparisons",
  "Creative briefs & scripts",
  "Competitor ad deconstructions",
  "Creative Director on demand",
];

const UPGRADE_SUBHEADLINE =
  "You've reached your free analysis limit. Upgrade to continue discovering conversion leaks, comparing ad variants, and generating new creative angles that can improve campaign performance.";
const UPGRADE_CTA = "Unlock The Full Platform";

const FEATURE_SHORT: Record<ActionFeature, string> = {
  funnel_analyses: "funnel analyses",
  variant_comparisons: "variant comparisons",
  creative_briefs: "creative briefs",
  ad_deconstructions: "ad deconstructions",
  chat_messages: "Creative Director messages",
};

type PaywallCopy = {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  body: string;
  primaryLabel: string;
  mode: "upgrade" | "portal";
  showFeatures: boolean;
  showUsage: boolean;
  socialProof?: string;
};

function copyFor(
  reason: BlockReason,
  ctx: {
    feature?: ActionFeature;
    usageSummary: AccountUsageSummary;
  }
): PaywallCopy {
  const { feature, usageSummary } = ctx;
  const usageRow = feature
    ? usageSummary.features.find((f) => f.key === feature)
    : usageSummary.features.find((f) => !f.unlimited && f.limit > 0 && f.used >= f.limit);

  switch (reason) {
    case "payment_failed":
      return {
        eyebrow: "Payment issue",
        title: "Update your payment method",
        body: "Your last payment didn't go through. Update your card to keep your analyses, briefs, and strategist running without interruption.",
        primaryLabel: "Update payment method",
        mode: "portal",
        showFeatures: false,
        showUsage: false,
      };
    case "plan_limit": {
      const featureLabel = feature ? FEATURE_SHORT[feature] : "usage";
      const planName = usageSummary.planDisplayName;
      const limit = usageRow?.limit ?? 0;

      return {
        eyebrow: "Monthly limit reached",
        title: "You're Outgrowing",
        titleAccent: `${planName}.`,
        body:
          limit > 0
            ? `You've used all ${limit} ${featureLabel} on your ${planName} plan this month. Upgrade now to keep testing — higher limits apply immediately, no waiting for reset.`
            : `You've reached your ${planName} plan limit for ${featureLabel}. Upgrade to keep your momentum going without interruption.`,
        primaryLabel: "Upgrade Now",
        mode: "upgrade",
        showFeatures: true,
        showUsage: true,
        socialProof:
          planName === "Starter"
            ? "Most teams upgrade to Growth when they hit this point."
            : "Power users on Agency run 3× more tests per month.",
      };
    }
    case "trial_limit":
      return {
        eyebrow: "Free limit reached",
        title: "You Found The Bottlenecks.",
        titleAccent: "Now Fix Them.",
        body: UPGRADE_SUBHEADLINE,
        primaryLabel: UPGRADE_CTA,
        mode: "upgrade",
        showFeatures: true,
        showUsage: false,
        socialProof: "Join marketers who stress-test every ad before they spend.",
      };
    case "trial_expired":
      return {
        eyebrow: "Trial ended",
        title: "You Found The Bottlenecks.",
        titleAccent: "Now Fix Them.",
        body: "Your free trial has ended. Upgrade to keep discovering conversion leaks, comparing ad variants, and generating creative angles that improve campaign performance.",
        primaryLabel: UPGRADE_CTA,
        mode: "upgrade",
        showFeatures: true,
        showUsage: false,
      };
    case "paywalled":
    default:
      return {
        eyebrow: "Upgrade required",
        title: "You Found The Bottlenecks.",
        titleAccent: "Now Fix Them.",
        body: UPGRADE_SUBHEADLINE,
        primaryLabel: UPGRADE_CTA,
        mode: "upgrade",
        showFeatures: true,
        showUsage: false,
      };
  }
}

function getRecommendedTierKey(
  currentTierKey: string | null,
  tiers: SubscriptionTier[]
): string | null {
  if (tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
  if (!currentTierKey) {
    return sorted.find((t) => t.is_featured)?.key ?? sorted[1]?.key ?? sorted[0].key;
  }
  const idx = sorted.findIndex((t) => t.key === currentTierKey);
  if (idx === -1) return sorted.find((t) => t.is_featured)?.key ?? sorted[0].key;
  if (idx >= sorted.length - 1) return sorted[idx].key;
  return sorted[idx + 1].key;
}

function filterUpgradeTiers(
  tiers: SubscriptionTier[],
  currentTierKey: string | null,
  reason: BlockReason
): SubscriptionTier[] {
  if (reason !== "plan_limit" || !currentTierKey) return tiers;
  const current = tiers.find((t) => t.key === currentTierKey);
  if (!current) return tiers;
  return tiers.filter((t) => t.sort_order >= current.sort_order);
}

function UsageLimitBar({ row }: { row: UsageFeatureRow }) {
  const pct =
    row.limit > 0 ? Math.min(100, Math.round((row.used / row.limit) * 100)) : 100;

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-white/88">{row.label}</p>
        <p className="text-[13px] font-semibold text-red-300">
          {row.used}
          <span className="font-medium text-white/45"> / {row.limit}</span>
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-linear-to-r from-red-500 to-amber-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-white/42">
        {row.resetPeriod === "daily" ? "Resets daily" : "Resets monthly"} ·{" "}
        <span className="text-white/58">100% used</span>
      </p>
    </div>
  );
}

type IconProps = { className?: string };

function IconX({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function IconArrow({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8H13M13 8L9 4M13 8L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path strokeLinecap="round" d="M8 11V8a4 4 0 118 0v3" />
    </svg>
  );
}

export function UpgradePaywallModal({
  modal,
  snapshot,
  usageSummary,
  onClose,
}: {
  modal: ModalState;
  snapshot: AccountSnapshot;
  usageSummary: AccountUsageSummary;
  onClose: () => void;
}) {
  const [working, setWorking] = useState(false);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [limitLookup, setLimitLookup] = useState<
    Record<string, Record<string, number>>
  >({});
  const [pricingReady, setPricingReady] = useState(false);

  const reason = modal?.reason ?? "paywalled";
  const copy = copyFor(reason, {
    feature: modal?.feature,
    usageSummary,
  });
  const showPricing = copy.mode === "upgrade";

  const usageRow = useMemo(() => {
    if (!modal?.feature) {
      return usageSummary.features.find(
        (f) => !f.unlimited && f.limit > 0 && f.used >= f.limit
      );
    }
    return usageSummary.features.find((f) => f.key === modal.feature);
  }, [modal?.feature, usageSummary.features]);

  useEffect(() => {
    if (!modal) return;
    const html = document.documentElement;
    const main = document.querySelector(".app-main") as HTMLElement | null;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    const prevMain = main?.style.overflow ?? "";
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (main) main.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      if (main) main.style.overflow = prevMain;
    };
  }, [modal]);

  useEffect(() => {
    if (!modal || !showPricing) return;

    let cancelled = false;
    setPricingReady(false);

    async function loadPricing() {
      try {
        const supabase = createClient();
        const [tiersRes, limitsRes] = await Promise.all([
          supabase
            .from("subscription_tiers")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          supabase.from("tier_feature_limits").select("tier_id, feature_key, limit_value"),
        ]);

        if (cancelled) return;

        const nextTiers = (tiersRes.data ?? []) as SubscriptionTier[];
        const lookup: Record<string, Record<string, number>> = {};

        for (const row of limitsRes.data ?? []) {
          if (!lookup[row.tier_id]) lookup[row.tier_id] = {};
          lookup[row.tier_id][row.feature_key] = row.limit_value;
        }

        setTiers(nextTiers);
        setLimitLookup(lookup);
      } finally {
        if (!cancelled) setPricingReady(true);
      }
    }

    void loadPricing();
    return () => {
      cancelled = true;
    };
  }, [modal, showPricing]);

  const visibleTiers = useMemo(
    () => filterUpgradeTiers(tiers, snapshot.subscriptionTierKey, reason),
    [tiers, snapshot.subscriptionTierKey, reason]
  );

  const recommendedTierKey = useMemo(
    () => getRecommendedTierKey(snapshot.subscriptionTierKey, tiers),
    [snapshot.subscriptionTierKey, tiers]
  );

  const currentLimits = useMemo(() => {
    if (!snapshot.subscriptionTierKey) return {};
    const tier = tiers.find((t) => t.key === snapshot.subscriptionTierKey);
    return tier ? limitLookup[tier.id] ?? {} : {};
  }, [tiers, limitLookup, snapshot.subscriptionTierKey]);

  async function handlePrimary() {
    setWorking(true);
    const result = await openBillingPortal();
    if (!result.ok) setWorking(false);
  }

  return (
    <AnimatePresence>
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[rgba(8,7,17,0.75)] backdrop-blur-[6px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={[
              "relative z-[101] w-full max-h-[calc(100dvh-1.5rem)] overflow-hidden",
              showPricing ? "max-w-[46rem]" : "max-w-[26rem]",
            ].join(" ")}
            role="dialog"
            aria-modal="true"
          >
            <div className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0c0918] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:rounded-[24px]">
              <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
                <div className="pointer-events-none absolute -right-12 top-1/3 h-40 w-40 rounded-full bg-accent-tertiary/10 blur-3xl" />

                <div className="relative px-4 py-4 sm:px-7 sm:py-6">
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-white/5 p-1.5 text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white sm:right-4 sm:top-4 sm:p-2"
                  >
                    <IconX className="h-4 w-4" />
                  </button>

                  <div className="mx-auto max-w-lg text-center">
                    <div className="relative mx-auto mb-2 flex h-9 w-9 items-center justify-center sm:mb-3 sm:h-10 sm:w-10">
                      <div className="absolute inset-0 rounded-xl bg-accent/25 blur-md" />
                      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/15 text-accent sm:h-10 sm:w-10">
                        <IconLock className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 sm:px-3 sm:py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-tertiary" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/50 sm:text-[10px]">
                        {copy.eyebrow}
                      </span>
                    </div>

                    <h2 className="mt-2 font-display text-[1.125rem] font-semibold leading-[1.12] tracking-[-0.04em] text-white sm:mt-2.5 sm:text-[1.4rem]">
                      {copy.title}
                      {copy.titleAccent ? (
                        <>
                          {" "}
                          <span className="bg-linear-to-r from-accent-tertiary to-accent bg-clip-text text-transparent">
                            {copy.titleAccent}
                          </span>
                        </>
                      ) : null}
                    </h2>

                    <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-[1.5] text-white/55 sm:mt-2 sm:text-[13px] sm:leading-[1.55]">
                      {copy.body}
                    </p>

                    {copy.socialProof && (
                      <p className="mx-auto mt-1.5 hidden text-[11px] font-medium text-accent-tertiary/80 sm:block sm:mt-2">
                        {copy.socialProof}
                      </p>
                    )}
                  </div>

                  {copy.showUsage && usageRow && (
                    <div className="mx-auto mt-2.5 max-w-md sm:mt-3.5">
                      <UsageLimitBar row={usageRow} />
                    </div>
                  )}

                  {copy.showFeatures && (
                    <>
                      <div className="mx-auto my-2.5 max-w-lg border-t border-white/10 sm:my-3.5" />

                      <div className="mx-auto max-w-lg">
                        <p className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                          What you unlock
                        </p>
                        <div className="mt-1.5 hidden flex-wrap justify-center gap-1.5 sm:mt-2 sm:flex sm:gap-2">
                          {UPGRADE_BENEFITS.map((item) => (
                            <span
                              key={item}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/65"
                            >
                              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0 text-accent-tertiary">
                                <path
                                  d="M2 7L5.5 10.5L12 3.5"
                                  stroke="currentColor"
                                  strokeWidth="1.75"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              {item}
                            </span>
                          ))}
                        </div>
                        <ul className="mt-1.5 space-y-1 sm:hidden">
                          {UPGRADE_BENEFITS.slice(0, 3).map((item) => (
                            <li
                              key={item}
                              className="flex items-center justify-center gap-1.5 text-[11px] text-white/60"
                            >
                              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0 text-accent-tertiary">
                                <path
                                  d="M2 7L5.5 10.5L12 3.5"
                                  stroke="currentColor"
                                  strokeWidth="1.75"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  {showPricing ? (
                    <div className="mt-3 border-t border-white/10 pt-3 sm:mt-4 sm:pt-4">
                      {reason === "plan_limit" && (
                        <p className="mb-2 hidden text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 sm:mb-3 sm:block">
                          Pick your upgrade
                        </p>
                      )}
                      {!pricingReady ? (
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-[9.5rem] animate-pulse rounded-xl border border-white/8 bg-white/[0.04] sm:h-[14.5rem] sm:rounded-2xl"
                            />
                          ))}
                        </div>
                      ) : visibleTiers.length > 0 ? (
                        <PaywallPlanCards
                          tiers={visibleTiers}
                          limitLookup={limitLookup}
                          currentTierKey={snapshot.subscriptionTierKey}
                          recommendedTierKey={recommendedTierKey}
                          featuredCtaLabel={copy.primaryLabel}
                          highlightFeature={modal?.feature ?? usageRow?.key}
                          currentLimits={currentLimits}
                          isPlanLimit={reason === "plan_limit"}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div className="mx-auto mt-6 max-w-md">
                      <button
                        type="button"
                        onClick={handlePrimary}
                        disabled={working}
                        className="btn-primary w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {working ? "Opening…" : copy.primaryLabel}
                        {!working && <IconArrow className="h-4 w-4" />}
                      </button>
                    </div>
                  )}

                  <p className="mx-auto mt-3 max-w-lg text-center text-[9px] leading-relaxed text-white/28 sm:mt-4 sm:text-[10px]">
                    Cancel anytime · Secure checkout by Stripe · Instant access
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
