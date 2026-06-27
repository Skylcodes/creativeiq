import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUserId } from "@/lib/admin/auth";
import {
  countAccountWorkspaces,
  countAccountUsage,
} from "@/lib/billing/account";
import type { AccountStatus } from "@/lib/billing/account-types";
import { getTrialWorkspaceLimit } from "@/lib/billing/trial-limits";
import { FEATURE_LABELS } from "@/lib/billing/feature-keys";
export type { FeatureKey } from "@/lib/billing/feature-keys";
export { FEATURE_LABELS, FEATURE_RESET_PERIODS } from "@/lib/billing/feature-keys";

/** -1 is the unlimited sentinel used across the billing system. */
export const UNLIMITED = -1;

export function isUnlimitedLimit(limit: number): boolean {
  return limit === UNLIMITED;
}

const POOLED_USAGE_FEATURES = new Set([
  "funnel_analyses",
  "variant_comparisons",
  "creative_briefs",
  "ad_deconstructions",
  "chat_messages",
]);

function isPooledFeature(featureKey: string): boolean {
  return POOLED_USAGE_FEATURES.has(featureKey);
}

async function loadProfileLimitSnapshot(
  userId: string
): Promise<{ tierKey: string; snapshot: Record<string, number> | null }> {
  const db = createAdminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("subscription_tier_key, subscription_limit_snapshot")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return { tierKey: "starter", snapshot: null };

  return {
    tierKey: (profile.subscription_tier_key as string) || "starter",
    snapshot: profile.subscription_limit_snapshot as Record<string, number> | null,
  };
}

async function liveTierLimits(tierKey: string): Promise<Record<string, number>> {
  const db = createAdminClient();
  const { data: tier } = await db
    .from("subscription_tiers")
    .select("id")
    .eq("key", tierKey)
    .maybeSingle();

  if (!tier) return {};

  const { data: rows } = await db
    .from("tier_feature_limits")
    .select("feature_key, limit_value")
    .eq("tier_id", tier.id);

  const limits: Record<string, number> = {};
  for (const row of rows ?? []) {
    limits[row.feature_key] = row.limit_value as number;
  }
  return limits;
}

async function loadAccountOverride(
  userId: string,
  featureKey: string
): Promise<number | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("account_limit_overrides")
    .select("override_limit_value, expires_at")
    .eq("user_id", userId)
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (!data) return null;

  const expiresAt = data.expires_at as string | null;
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    return null;
  }

  return data.override_limit_value as number;
}

/** Admin override for an account (null if none or expired). */
export async function getAccountLimitOverride(
  userId: string,
  featureKey: string
): Promise<number | null> {
  return loadAccountOverride(userId, featureKey);
}

/**
 * Effective limit for an account — pooled across all workspaces.
 * Admin account_limit_overrides take precedence over tier/snapshot limits.
 */
export async function getAccountFeatureLimit(
  userId: string,
  featureKey: string
): Promise<number> {
  if (await isAdminUserId(userId)) {
    return UNLIMITED;
  }

  const override = await loadAccountOverride(userId, featureKey);
  if (override !== null) {
    return override;
  }

  const { tierKey, snapshot } = await loadProfileLimitSnapshot(userId);

  let limit: number | undefined;
  if (snapshot && Object.prototype.hasOwnProperty.call(snapshot, featureKey)) {
    limit = snapshot[featureKey];
  } else {
    const live = await liveTierLimits(tierKey);
    limit = live[featureKey];
  }

  if (limit === undefined) return 0;
  return limit;
}

/**
 * Lifetime workspace cap for an account (trial, paid tier, or blocked).
 */
export async function getAccountWorkspaceLimit(
  userId: string,
  accountStatus: AccountStatus,
  stripeSubscriptionId?: string | null
): Promise<number> {
  if (await isAdminUserId(userId)) {
    return UNLIMITED;
  }

  const override = await loadAccountOverride(userId, "workspaces");
  if (override !== null) {
    return override;
  }

  if (
    accountStatus === "trialing" ||
    (accountStatus === "paywalled" && !stripeSubscriptionId)
  ) {
    return getTrialWorkspaceLimit();
  }

  if (accountStatus === "active" || accountStatus === "payment_failed") {
    return getAccountFeatureLimit(userId, "workspaces");
  }

  return 0;
}

/** Pooled usage for AI features; workspace count for `workspaces` key. */
export async function getAccountFeatureUsage(
  userId: string,
  featureKey: string
): Promise<number> {
  if (featureKey === "workspaces" || featureKey === "user_seats") {
    return countAccountWorkspaces(userId);
  }
  if (isPooledFeature(featureKey)) {
    return countAccountUsage(userId, featureKey);
  }
  return 0;
}

/** All effective account-wide limits (includes admin overrides). */
export async function getAllAccountFeatureLimits(
  userId: string
): Promise<Record<string, number>> {
  if (await isAdminUserId(userId)) {
    const unlimited: Record<string, number> = {};
    for (const key of Object.keys(FEATURE_LABELS)) {
      unlimited[key] = UNLIMITED;
    }
    return unlimited;
  }

  const { tierKey, snapshot } = await loadProfileLimitSnapshot(userId);
  const live = await liveTierLimits(tierKey);

  const allKeys = new Set([
    ...Object.keys(snapshot ?? {}),
    ...Object.keys(live),
    ...Object.keys(FEATURE_LABELS),
  ]);

  const result: Record<string, number> = {};
  for (const key of allKeys) {
    result[key] = await getAccountFeatureLimit(userId, key);
  }

  return result;
}

/**
 * Snapshots tier limits onto the account profile after subscribe / plan change.
 */
export async function snapshotTierLimitsForAccount(
  userId: string,
  tierKey: string
): Promise<void> {
  const db = createAdminClient();
  const live = await liveTierLimits(tierKey);
  if (!Object.keys(live).length) return;

  await db
    .from("profiles")
    .update({
      subscription_limit_snapshot: live,
      subscription_tier_key: tierKey,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
