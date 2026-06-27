import { createClient } from "@supabase/supabase-js";
import type { SubscriptionTier, TierFeatureLimit } from "@/components/admin/types";
import { PricingCard } from "@/components/landing/pricing-card";

async function fetchPricingData(): Promise<{
  tiers: SubscriptionTier[];
  limits: TierFeatureLimit[];
}> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [tiersRes, limitsRes] = await Promise.all([
      supabase
        .from("subscription_tiers")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("tier_feature_limits")
        .select("*")
        .order("feature_key", { ascending: true }),
    ]);

    return {
      tiers: (tiersRes.data ?? []) as SubscriptionTier[],
      limits: (limitsRes.data ?? []) as TierFeatureLimit[],
    };
  } catch {
    return { tiers: [], limits: [] };
  }
}

export async function Pricing({
  ctaLabel,
  currentTierKey,
}: {
  ctaLabel?: string;
  currentTierKey?: string | null;
} = {}) {
  const { tiers, limits } = await fetchPricingData();

  if (tiers.length === 0) return null;

  const limitLookup: Record<string, Record<string, number>> = {};
  for (const l of limits) {
    if (!limitLookup[l.tier_id]) limitLookup[l.tier_id] = {};
    limitLookup[l.tier_id][l.feature_key] = l.limit_value;
  }

  return (
    <section
      id="pricing"
      className="landing-section-pricing relative overflow-x-clip py-24 md:py-32"
    >
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(105,71,255,0.18) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8">
        {/* Header */}
        <div className="mx-auto mb-16 max-w-xl text-center">
          <span className="mb-4 inline-flex rounded-full border border-accent/25 bg-accent/12 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-tertiary">
            Pricing
          </span>
          <h2 className="font-display text-4xl font-semibold tracking-[-0.045em] text-white md:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/60">
            One price. No per-seat fees. Cancel anytime.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {tiers.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              limitLookup={limitLookup[tier.id] ?? {}}
              ctaLabel={ctaLabel}
              currentTierKey={currentTierKey}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
