import "server-only";

import {
  countAccountUsage,
  countAccountWorkspaces,
  countTrialUsage,
  evaluateAccountState,
  type AccountState,
} from "@/lib/billing/account";
import type { ActionFeature } from "@/lib/billing/account-types";
import { getTrialConfig } from "@/lib/billing/trial-limits";
import {
  FEATURE_LABELS,
  FEATURE_RESET_PERIODS,
  PRICING_FEATURE_KEYS,
  type FeatureKey,
} from "@/lib/billing/feature-keys";
import {
  getAccountFeatureLimit,
  getAccountLimitOverride,
  isUnlimitedLimit,
  UNLIMITED,
} from "@/lib/billing/feature-limits";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AccountUsageSummary,
  UsageFeatureRow,
} from "@/lib/billing/usage-summary-types";

export type { AccountUsageSummary, UsageFeatureRow } from "@/lib/billing/usage-summary-types";

const DISPLAY_FEATURE_KEYS: FeatureKey[] = PRICING_FEATURE_KEYS.filter(
  (k) => k !== "user_seats"
);

function shortLabel(key: FeatureKey): string {
  return FEATURE_LABELS[key] ?? key;
}

/** Trial caps apply while trialing, and for paywalled users who never subscribed. */
function usesTrialLimits(state: AccountState): boolean {
  if (state.isAdmin) return false;
  if (state.account_status === "trialing") return true;
  if (state.account_status === "paywalled" && !state.stripe_subscription_id) {
    return true;
  }
  return false;
}

function hasPaidSubscription(state: AccountState): boolean {
  return Boolean(state.stripe_subscription_id);
}

async function tierMeta(tierKey: string): Promise<{
  displayName: string;
  monthlyPrice: number | null;
}> {
  const db = createAdminClient();
  const { data } = await db
    .from("subscription_tiers")
    .select("display_name, monthly_price")
    .eq("key", tierKey)
    .maybeSingle();

  if (!data) {
    const fallback = tierKey.charAt(0).toUpperCase() + tierKey.slice(1);
    return { displayName: fallback, monthlyPrice: null };
  }

  return {
    displayName: data.display_name as string,
    monthlyPrice: Number(data.monthly_price),
  };
}

function resolvePlanDisplay(
  state: AccountState,
  tierKey: string | null,
  tier: { displayName: string; monthlyPrice: number | null }
): { displayName: string; priceMonthly: number | null } {
  if (state.isAdmin) {
    return { displayName: "Founder", priceMonthly: null };
  }

  if (state.account_status === "trialing") {
    return { displayName: "Free trial", priceMonthly: null };
  }

  if (state.account_status === "paywalled" && !hasPaidSubscription(state)) {
    return { displayName: "Trial ended", priceMonthly: null };
  }

  if (
    (state.account_status === "active" ||
      state.account_status === "payment_failed") &&
    tierKey
  ) {
    return { displayName: tier.displayName, priceMonthly: tier.monthlyPrice };
  }

  if (state.account_status === "paywalled") {
    return { displayName: "Subscription inactive", priceMonthly: null };
  }

  return { displayName: "No plan", priceMonthly: null };
}

async function resolveLimit(
  userId: string,
  key: FeatureKey,
  state: AccountState,
  trialLimits: Record<string, number>
): Promise<number> {
  if (state.isAdmin) return UNLIMITED;

  const override = await getAccountLimitOverride(userId, key);
  if (override !== null) return override;

  if (usesTrialLimits(state)) {
    if (key in trialLimits) {
      return trialLimits[key] ?? 0;
    }
    return 0;
  }

  if (
    state.account_status === "active" ||
    state.account_status === "payment_failed"
  ) {
    return getAccountFeatureLimit(userId, key);
  }

  return 0;
}

async function resolveUsed(
  userId: string,
  key: FeatureKey,
  state: AccountState
): Promise<number> {
  if (key === "workspaces") {
    return countAccountWorkspaces(userId);
  }

  const actionKey = key as ActionFeature;

  if (usesTrialLimits(state)) {
    return countTrialUsage(userId, actionKey);
  }

  return countAccountUsage(userId, actionKey);
}

/** Account-wide usage vs plan limits (pooled across all workspaces). */
export async function getAccountUsageSummary(
  userId: string
): Promise<AccountUsageSummary> {
  const state = await evaluateAccountState(userId);
  const tierKey = state.subscription_tier_key;
  const tier = tierKey
    ? await tierMeta(tierKey)
    : { displayName: "No plan", monthlyPrice: null };
  const plan = resolvePlanDisplay(state, tierKey, tier);
  const trialConfig = await getTrialConfig();

  const features: UsageFeatureRow[] = [];

  for (const key of DISPLAY_FEATURE_KEYS) {
    const limit = await resolveLimit(userId, key, state, trialConfig.limits);
    const used = await resolveUsed(userId, key, state);

    features.push({
      key,
      label: shortLabel(key),
      used,
      limit,
      resetPeriod: FEATURE_RESET_PERIODS[key] ?? "monthly",
      unlimited: isUnlimitedLimit(limit),
    });
  }

  return {
    accountStatus: state.account_status,
    isAdmin: state.isAdmin,
    hasPaidSubscription: hasPaidSubscription(state),
    trialDaysLeft:
      state.account_status === "trialing" && state.trial_ends_at
        ? Math.max(
            0,
            Math.ceil(
              (new Date(state.trial_ends_at).getTime() - Date.now()) / 86_400_000
            )
          )
        : null,
    planKey: tierKey,
    planDisplayName: plan.displayName,
    planPriceMonthly: plan.priceMonthly,
    workspaceCount: await countAccountWorkspaces(userId),
    features,
  };
}
