"use client";

import { useState } from "react";
import type { SubscriptionTier } from "@/components/admin/types";
import { startCheckout } from "@/lib/billing/checkout-client";
import {
  FEATURE_LABELS,
  formatFeatureLimit,
} from "@/lib/billing/feature-keys";

const HIGHLIGHT_KEYS = [
  "funnel_analyses",
  "variant_comparisons",
  "workspaces",
] as const;

type PaywallPlanCardsProps = {
  tiers: SubscriptionTier[];
  limitLookup: Record<string, Record<string, number>>;
  currentTierKey: string | null;
  recommendedTierKey: string | null;
  featuredCtaLabel: string;
  highlightFeature?: string;
  currentLimits?: Record<string, number>;
  isPlanLimit?: boolean;
};

function formatPrice(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
}

function formatDelta(current: number | undefined, next: number): string | null {
  if (current === undefined || next <= current) return null;
  const diff = next - current;
  return `+${formatFeatureLimit(diff)}`;
}

function shortMobileCta(label: string, tierName: string, isRecommended: boolean): string {
  if (isRecommended) return "Unlock";
  if (label === "Current plan") return "Current";
  return tierName;
}

export function PaywallPlanCards({
  tiers,
  limitLookup,
  currentTierKey,
  recommendedTierKey,
  featuredCtaLabel,
  highlightFeature,
  currentLimits = {},
  isPlanLimit = false,
}: PaywallPlanCardsProps) {
  const displayKeys = highlightFeature
    ? ([highlightFeature, ...HIGHLIGHT_KEYS.filter((k) => k !== highlightFeature)].slice(
        0,
        3
      ) as string[])
    : [...HIGHLIGHT_KEYS];

  return (
    <div className="grid grid-cols-3 gap-2 sm:items-stretch sm:gap-3">
      {tiers.map((tier) => {
        const isRecommended = tier.key === recommendedTierKey;
        const isCurrent = currentTierKey === tier.key;
        const showFeaturedBadge = isPlanLimit ? isRecommended && !isCurrent : tier.is_featured;

        const desktopCta =
          isRecommended && !isCurrent
            ? isPlanLimit
              ? `Upgrade to ${tier.display_name}`
              : featuredCtaLabel
            : isCurrent
              ? "Current plan"
              : `Get ${tier.display_name}`;

        return (
          <PaywallPlanCard
            key={tier.id}
            tier={tier}
            limits={limitLookup[tier.id] ?? {}}
            displayKeys={displayKeys}
            currentLimits={currentLimits}
            isCurrent={isCurrent}
            isRecommended={showFeaturedBadge}
            badgeLabel={isPlanLimit ? "Recommended" : "Most Popular"}
            ctaLabel={desktopCta}
            mobileCtaLabel={shortMobileCta(
              desktopCta,
              tier.display_name,
              showFeaturedBadge && !isCurrent
            )}
          />
        );
      })}
    </div>
  );
}

function PaywallPlanCard({
  tier,
  limits,
  displayKeys,
  currentLimits,
  isCurrent,
  isRecommended,
  badgeLabel,
  ctaLabel,
  mobileCtaLabel,
}: {
  tier: SubscriptionTier;
  limits: Record<string, number>;
  displayKeys: string[];
  currentLimits: Record<string, number>;
  isCurrent: boolean;
  isRecommended: boolean;
  badgeLabel: string;
  ctaLabel: string;
  mobileCtaLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (isCurrent || loading) return;
    setLoading(true);
    setError(null);
    const result = await startCheckout(tier.key, "month");
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div
      className={[
        "relative flex min-w-0 flex-col rounded-xl border p-2.5 transition-all sm:min-h-[15.5rem] sm:rounded-2xl sm:p-5",
        isRecommended && !isCurrent
          ? "border-accent/50 bg-accent/[0.12] shadow-[0_0_32px_rgba(105,71,255,0.2)] sm:scale-[1.04] sm:shadow-[0_0_40px_rgba(105,71,255,0.24)]"
          : isCurrent
            ? "border-white/8 bg-white/[0.02] opacity-80"
            : "border-white/10 bg-white/[0.04]",
        loading ? "ring-2 ring-accent/50" : "",
      ].join(" ")}
    >
      {isRecommended && !isCurrent && (
        <div className="absolute -top-2 left-1/2 z-10 max-w-[calc(100%+0.5rem)] -translate-x-1/2 truncate whitespace-nowrap sm:-top-3">
          <span className="rounded-full bg-accent px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-white shadow-lg sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.14em]">
            <span className="sm:hidden">{badgeLabel === "Most Popular" ? "Popular" : "Best"}</span>
            <span className="hidden sm:inline">{badgeLabel}</span>
          </span>
        </div>
      )}

      <div className={isRecommended ? "pt-1 sm:pt-2" : undefined}>
        <h3 className="truncate font-display text-[13px] font-semibold text-white sm:text-lg">
          {tier.display_name}
        </h3>
        <div className="mt-1 flex items-baseline gap-0.5 sm:mt-2 sm:gap-1">
          <span className="font-display text-xl font-semibold tracking-tight text-white sm:text-3xl">
            ${formatPrice(tier.monthly_price)}
          </span>
          <span className="text-[10px] text-white/40 sm:text-sm">/mo</span>
        </div>
      </div>

      <ul className="mt-3 hidden flex-1 space-y-2 sm:block">
        {displayKeys.map((key) => {
          const value = limits[key];
          if (value === undefined) return null;
          const label = FEATURE_LABELS[key]?.split(" /")[0] ?? key;
          const delta = formatDelta(currentLimits[key], value);

          return (
            <li
              key={key}
              className="flex items-start gap-2 text-xs leading-snug text-white/62"
            >
              <svg
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-tertiary"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 7L5.5 10.5L12 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>
                <span className="font-semibold text-white/85">
                  {formatFeatureLimit(value)}
                </span>{" "}
                {label}
                {delta && (
                  <span className="ml-1 font-semibold text-emerald-400">{delta}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={isCurrent || loading}
        className={[
          "mt-2.5 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-semibold transition-all sm:mt-4 sm:gap-2 sm:rounded-xl sm:py-3 sm:text-sm",
          isCurrent
            ? "cursor-default border border-white/10 bg-white/[0.04] text-white/35"
            : isRecommended
              ? "bg-accent text-white shadow-[0_4px_20px_rgba(105,71,255,0.4)] hover:bg-accent-hover sm:shadow-[0_4px_24px_rgba(105,71,255,0.45)]"
              : "border border-white/12 bg-white/[0.06] text-white/78 hover:border-white/20 hover:bg-white/[0.09] hover:text-white",
          loading ? "opacity-70" : "",
        ].join(" ")}
      >
        <span className="truncate sm:hidden">
          {isCurrent ? "Current" : loading ? "…" : mobileCtaLabel}
        </span>
        <span className="hidden items-center gap-2 sm:inline-flex">
          {isCurrent ? "Current plan" : loading ? "Starting checkout…" : ctaLabel}
          {!isCurrent && !loading && (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 8H13M13 8L9 4M13 8L9 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </button>

      {error && (
        <p className="mt-1.5 text-center text-[9px] leading-snug text-red-400 sm:mt-2 sm:text-[10px]">
          {error}
        </p>
      )}
    </div>
  );
}
