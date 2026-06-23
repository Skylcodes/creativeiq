"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { SubscriptionTier } from "@/components/admin/types";
import { startCheckout } from "@/lib/billing/checkout-client";
import {
  FEATURE_LABELS,
  PRICING_FEATURE_KEYS,
  formatFeatureLimit,
} from "@/lib/billing/feature-keys";

type Props = {
  tier: SubscriptionTier;
  limitLookup: Record<string, number>;
  /** When set, this is the upgrade flow (subscribe via Stripe) rather than marketing. */
  ctaLabel?: string;
  /** The viewer's current tier key — marks "Current plan" and disables the CTA. */
  currentTierKey?: string | null;
};

export function PricingCard({ tier, limitLookup, ctaLabel, currentTierKey }: Props) {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = annual ? tier.annual_price / 12 : tier.monthly_price;
  const foundingPrice = tier.founding_price;
  const foundingSoldOut = foundingPrice !== null && (tier.founding_slots ?? 0) <= 0;
  const showFounding = foundingPrice !== null && (tier.founding_slots ?? 0) > 0;
  const isCurrent = currentTierKey === tier.key;

  async function handleSubscribe() {
    if (isCurrent || loading) return;
    setLoading(true);
    setError(null);
    const result = await startCheckout(tier.key, annual ? "year" : "month");
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setLoading(false);
    }
    // On success the browser is already navigating to Stripe.
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "relative flex flex-col rounded-[22px] border p-6",
        tier.is_featured
          ? "border-accent/30 bg-gradient-to-b from-accent/[0.08] to-transparent shadow-[0_0_60px_rgba(105,71,255,0.15)]"
          : "border-white/[0.07] bg-white/[0.03]",
      ].join(" ")}
    >
      {/* Featured badge */}
      {tier.is_featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg">
            Most Popular
          </span>
        </div>
      )}

      {/* Tier name + description */}
      <div>
        <h3 className="font-display text-xl font-semibold text-white">{tier.display_name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-white/45">{tier.description}</p>
      </div>

      {/* Billing toggle */}
      <div className="mt-5 flex items-center gap-2.5">
        <button
          onClick={() => setAnnual(false)}
          className={[
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            !annual
              ? "bg-white/[0.08] text-white"
              : "text-white/35 hover:text-white/60",
          ].join(" ")}
        >
          Monthly
        </button>
        <button
          onClick={() => setAnnual(true)}
          className={[
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            annual
              ? "bg-white/[0.08] text-white"
              : "text-white/35 hover:text-white/60",
          ].join(" ")}
        >
          Annual
          <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-green-400">
            Save {Math.round((1 - tier.annual_price / (tier.monthly_price * 12)) * 100)}%
          </span>
        </button>
      </div>

      {/* Price */}
      <div className="mt-4">
        <div className="flex items-end gap-1">
          <span className="font-display text-4xl font-semibold text-white">
            ${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
          </span>
          <span className="mb-1.5 text-sm text-white/40">/mo</span>
        </div>
        {annual && (
          <p className="mt-1 text-xs text-white/30">
            Billed annually — ${tier.annual_price.toFixed(0)}/year
          </p>
        )}

        {/* Founding member pricing */}
        {showFounding && (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-400">
              Founding Member: ${foundingPrice}/mo
            </p>
            <p className="mt-0.5 text-xs text-amber-300/50">
              Only {tier.founding_slots} spot{tier.founding_slots === 1 ? "" : "s"} left — locked in forever
            </p>
          </div>
        )}
        {foundingSoldOut && (
          <p className="mt-3 text-xs font-medium text-white/30">
            Founding seats sold out
          </p>
        )}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={isCurrent || loading}
        className={[
          "mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all",
          isCurrent
            ? "cursor-default border border-white/[0.12] bg-white/[0.04] text-white/40"
            : tier.is_featured
              ? "bg-accent text-white hover:bg-accent-hover shadow-[0_4px_20px_rgba(105,71,255,0.3)]"
              : "border border-white/[0.12] bg-white/[0.05] text-white/80 hover:bg-white/[0.08] hover:text-white",
          loading ? "opacity-70" : "",
        ].join(" ")}
      >
        {isCurrent
          ? "Current plan"
          : loading
            ? "Starting checkout…"
            : (ctaLabel ?? "Get started")}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-red-400">{error}</p>
      )}

      {/* Divider */}
      <div className="my-5 h-px w-full bg-white/[0.06]" />

      {/* Feature limits */}
      <ul className="flex flex-col gap-3">
        {PRICING_FEATURE_KEYS.map((key) => {
          const value = limitLookup[key];
          if (value === undefined) return null;
          const label = FEATURE_LABELS[key] ?? key;
          const formatted = formatFeatureLimit(value);
          const isUnlimited = value === -1;

          return (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/45">{label}</span>
              <span
                className={[
                  "text-sm font-semibold",
                  isUnlimited ? "text-green-400" : "text-white/80",
                ].join(" ")}
              >
                {formatted}
              </span>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
