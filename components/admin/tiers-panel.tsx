"use client";

import { useState } from "react";
import { TierCard } from "@/components/admin/tier-card";
import type { SubscriptionTier, TierFeatureLimit } from "@/components/admin/types";

type Props = {
  initialTiers: SubscriptionTier[];
  initialLimits: TierFeatureLimit[];
};

export function TiersPanel({ initialTiers, initialLimits }: Props) {
  const [tiers, setTiers] = useState<SubscriptionTier[]>(initialTiers);
  const [limits, setLimits] = useState<TierFeatureLimit[]>(initialLimits);

  function getLimitsForTier(tierId: string) {
    return limits.filter((l) => l.tier_id === tierId);
  }

  function handleTierSaved(tier: SubscriptionTier, newLimits: TierFeatureLimit[]) {
    setTiers((prev) => prev.map((t) => (t.id === tier.id ? tier : t)));
    setLimits((prev) => {
      const without = prev.filter((l) => l.tier_id !== tier.id);
      return [...without, ...newLimits];
    });
  }

  function handleFeaturedChange(tierId: string) {
    // Automatically unfeature all other tiers in local state when one is featured
    setTiers((prev) =>
      prev.map((t) => ({
        ...t,
        is_featured: t.id === tierId ? true : false,
      }))
    );
  }

  async function handleAddTier() {
    const key = prompt("Enter a unique internal key (lowercase, no spaces):");
    if (!key?.trim()) return;

    const res = await fetch("/api/admin/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: key.trim(),
        display_name: "New Tier",
        description: "",
        monthly_price: 0,
        annual_price: 0,
        is_active: false,
        is_featured: false,
        sort_order: tiers.length + 1,
      }),
    });

    if (res.ok) {
      const { tier } = (await res.json()) as { tier: SubscriptionTier };
      setTiers((prev) => [...prev, tier]);
    } else {
      const { error } = (await res.json()) as { error: string };
      alert(`Failed to create tier: ${error}`);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Subscription Tiers</h1>
          <p className="mt-1 text-sm text-white/40">
            Manage pricing tiers and feature limits. Changes take effect immediately.
          </p>
        </div>
        <button
          onClick={handleAddTier}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Tier
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {tiers.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            limits={getLimitsForTier(tier.id)}
            onSaved={handleTierSaved}
            onFeaturedChange={handleFeaturedChange}
          />
        ))}
      </div>
    </div>
  );
}
