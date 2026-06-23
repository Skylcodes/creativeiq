"use client";

import { useMemo, useRef, useState } from "react";
import type { SubscriptionTier, TierFeatureLimit } from "@/components/admin/types";
import { FEATURE_LABELS, FEATURE_RESET_PERIODS } from "@/lib/billing/feature-keys";

type Props = {
  tier: SubscriptionTier;
  limits: TierFeatureLimit[];
  onSaved: (tier: SubscriptionTier, limits: TierFeatureLimit[]) => void;
  onFeaturedChange: (tierId: string) => void;
};

type LimitDraft = {
  feature_key: string;
  limit_value: string;
  reset_period: string;
};

type TierDraft = {
  display_name: string;
  description: string;
  monthly_price: string;
  annual_price: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: string;
  founding_enabled: boolean;
  founding_price: string;
  founding_slots: string;
};

function tierToDraft(tier: SubscriptionTier): TierDraft {
  return {
    display_name: tier.display_name,
    description: tier.description,
    monthly_price: String(tier.monthly_price),
    annual_price: String(tier.annual_price),
    is_active: tier.is_active,
    is_featured: tier.is_featured,
    sort_order: String(tier.sort_order),
    founding_enabled: tier.founding_price !== null,
    founding_price: tier.founding_price !== null ? String(tier.founding_price) : "",
    founding_slots: tier.founding_slots !== null ? String(tier.founding_slots) : "",
  };
}

function limitsToMap(limits: TierFeatureLimit[]): LimitDraft[] {
  const knownKeys = Object.keys(FEATURE_LABELS);
  const existingMap = Object.fromEntries(limits.map((l) => [l.feature_key, l]));

  const all: LimitDraft[] = knownKeys.map((key) => ({
    feature_key: key,
    limit_value: existingMap[key] ? String(existingMap[key].limit_value) : "0",
    reset_period:
      existingMap[key]?.reset_period ?? FEATURE_RESET_PERIODS[key] ?? "monthly",
  }));

  for (const l of limits) {
    if (!knownKeys.includes(l.feature_key)) {
      all.push({
        feature_key: l.feature_key,
        limit_value: String(l.limit_value),
        reset_period: l.reset_period,
      });
    }
  }

  return all;
}

function resolveFeatured(
  draft: TierDraft,
  baseline: TierDraft,
  tier: SubscriptionTier
): boolean {
  return draft.is_featured !== baseline.is_featured
    ? draft.is_featured
    : tier.is_featured;
}

export function TierCard({ tier, limits, onSaved, onFeaturedChange }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [draft, setDraft] = useState<TierDraft>(() => tierToDraft(tier));
  const [baselineDraft, setBaselineDraft] = useState<TierDraft>(() => tierToDraft(tier));
  const [limitDrafts, setLimitDrafts] = useState<LimitDraft[]>(() => limitsToMap(limits));
  const [baselineLimitDrafts, setBaselineLimitDrafts] = useState<LimitDraft[]>(() =>
    limitsToMap(limits)
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedFeatured = resolveFeatured(draft, baselineDraft, tier);

  const dirty = useMemo(() => {
    const effectiveDraft = { ...draft, is_featured: resolvedFeatured };
    return (
      JSON.stringify(effectiveDraft) !== JSON.stringify(baselineDraft) ||
      JSON.stringify(limitDrafts) !== JSON.stringify(baselineLimitDrafts)
    );
  }, [draft, baselineDraft, limitDrafts, baselineLimitDrafts, resolvedFeatured]);

  function setField<K extends keyof TierDraft>(key: K, value: TierDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setLimitValue(featureKey: string, value: string) {
    setLimitDrafts((prev) =>
      prev.map((l) => (l.feature_key === featureKey ? { ...l, limit_value: value } : l))
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const payload = {
      display_name: draft.display_name,
      description: draft.description,
      monthly_price: parseFloat(draft.monthly_price) || 0,
      annual_price: parseFloat(draft.annual_price) || 0,
      is_active: draft.is_active,
      is_featured: resolvedFeatured,
      sort_order: parseInt(draft.sort_order) || 0,
      founding_price: draft.founding_enabled
        ? parseFloat(draft.founding_price) || null
        : null,
      founding_slots: draft.founding_enabled
        ? parseInt(draft.founding_slots) || null
        : null,
      limits: limitDrafts.map((l) => ({
        feature_key: l.feature_key,
        limit_value: parseInt(l.limit_value) || 0,
        reset_period: l.reset_period,
      })),
    };

    try {
      const res = await fetch(`/api/admin/tiers/${tier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        tier?: SubscriptionTier;
        limits?: TierFeatureLimit[];
        error?: string;
      };

      if (!res.ok || !data.tier) {
        setSaveError(data.error ?? "Save failed");
        return;
      }

      const newDraft = tierToDraft(data.tier);
      const newLimitDrafts = limitsToMap(data.limits ?? []);

      setBaselineDraft(newDraft);
      setDraft(newDraft);
      setBaselineLimitDrafts(newLimitDrafts);
      setLimitDrafts(newLimitDrafts);

      if (data.tier.is_featured) {
        onFeaturedChange(tier.id);
      }

      onSaved(data.tier, data.limits ?? []);

      setSavedFlash(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSavedFlash(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white">{tier.display_name}</span>
          <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs font-mono text-white/40">
            {tier.key}
          </span>
          {!tier.is_active && (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
              Inactive
            </span>
          )}
          {tier.is_featured && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
              Featured
            </span>
          )}
          {dirty && !savedFlash && (
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
              Unsaved
            </span>
          )}
          {savedFlash && (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
              Saved ✓
            </span>
          )}
        </div>
        <svg
          className={[
            "h-4 w-4 text-white/30 transition-transform",
            expanded ? "rotate-180" : "",
          ].join(" ")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.05] px-6 pb-6 pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Display Name">
              <input
                type="text"
                value={draft.display_name}
                onChange={(e) => setField("display_name", e.target.value)}
                className="admin-input"
              />
            </Field>
            <Field label="Description">
              <input
                type="text"
                value={draft.description}
                onChange={(e) => setField("description", e.target.value)}
                className="admin-input"
                placeholder="Short one-liner for pricing page"
              />
            </Field>
            <Field label="Monthly Price ($)">
              <input
                type="number"
                min={0}
                step={0.01}
                value={draft.monthly_price}
                onChange={(e) => setField("monthly_price", e.target.value)}
                className="admin-input"
              />
            </Field>
            <Field label="Annual Price ($)">
              <input
                type="number"
                min={0}
                step={0.01}
                value={draft.annual_price}
                onChange={(e) => setField("annual_price", e.target.value)}
                className="admin-input"
              />
            </Field>
            <Field label="Sort Order">
              <input
                type="number"
                min={0}
                step={1}
                value={draft.sort_order}
                onChange={(e) => setField("sort_order", e.target.value)}
                className="admin-input"
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-6">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
                className="admin-checkbox"
              />
              <span className="text-sm text-white/60">Plan active</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={resolvedFeatured}
                onChange={(e) => {
                  setField("is_featured", e.target.checked);
                  if (e.target.checked) onFeaturedChange(tier.id);
                }}
                className="admin-checkbox"
              />
              <span className="text-sm text-white/60">Featured / Most Popular</span>
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={draft.founding_enabled}
                onChange={(e) => setField("founding_enabled", e.target.checked)}
                className="admin-checkbox"
              />
              <span className="text-sm font-medium text-white/70">
                Enable founding member pricing
              </span>
            </label>
            {draft.founding_enabled && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <Field label="Founding Member Monthly Price ($)">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={draft.founding_price}
                    onChange={(e) => setField("founding_price", e.target.value)}
                    className="admin-input"
                  />
                </Field>
                <Field label="Slots Remaining">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.founding_slots}
                    onChange={(e) => setField("founding_slots", e.target.value)}
                    className="admin-input"
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white/70">Usage Limits</h3>
              <span className="text-xs text-white/30">Use -1 for unlimited</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {limitDrafts.map((l) => (
                <Field
                  key={l.feature_key}
                  label={FEATURE_LABELS[l.feature_key] ?? l.feature_key}
                >
                  <input
                    type="number"
                    step={1}
                    value={l.limit_value}
                    onChange={(e) => setLimitValue(l.feature_key, e.target.value)}
                    className="admin-input"
                  />
                </Field>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/[0.05] pt-5">
            {saveError ? (
              <p className="text-sm text-red-400">{saveError}</p>
            ) : (
              <span />
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={[
                "rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
                saving || !dirty
                  ? "cursor-not-allowed bg-white/[0.05] text-white/30"
                  : "bg-white text-black hover:bg-white/90",
              ].join(" ")}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-white/40">{label}</label>
      {children}
    </div>
  );
}
