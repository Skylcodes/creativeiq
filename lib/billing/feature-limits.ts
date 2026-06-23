import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminWorkspace, isAdminUserId } from "@/lib/admin/auth";
import { FEATURE_LABELS } from "@/lib/billing/feature-keys";
export type { FeatureKey } from "@/lib/billing/feature-keys";
export { FEATURE_LABELS, FEATURE_RESET_PERIODS } from "@/lib/billing/feature-keys";

/** -1 is the unlimited sentinel used across the billing system. */
export const UNLIMITED = -1;

export function isUnlimitedLimit(limit: number): boolean {
  return limit === UNLIMITED;
}

/** Use for account-level limits (e.g. workspaces per user). */
export async function getAccountFeatureLimit(
  userId: string,
  workspaceId: string,
  featureKey: string
): Promise<number> {
  if (await isAdminUserId(userId)) {
    return UNLIMITED;
  }
  return getFeatureLimit(workspaceId, featureKey);
}

// ─── Core limit lookup ────────────────────────────────────────────────────────

/**
 * Returns the effective limit for (workspaceId, featureKey).
 *
 * Resolution order:
 *   0. Admin workspace owner (ADMIN_USER_EMAIL) → unlimited (-1)
 *   1. workspace_limit_overrides (if not expired)
 *   2. workspace.subscription_limit_snapshot[featureKey] (set at last renewal)
 *   3. Live tier_feature_limits for the workspace's subscription_tier_key
 *   4. Hard fallback: 0 (never silently allows unlimited access)
 *
 * -1 means unlimited everywhere in this system.
 */
export async function getFeatureLimit(
  workspaceId: string,
  featureKey: string
): Promise<number> {
  if (await isAdminWorkspace(workspaceId)) {
    return UNLIMITED;
  }

  const db = createAdminClient();

  // Step 1: Check workspace_limit_overrides
  const { data: override } = await db
    .from("workspace_limit_overrides")
    .select("override_limit_value, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (override) {
    // Check if not expired
    if (!override.expires_at || new Date(override.expires_at) > new Date()) {
      return override.override_limit_value as number;
    }
  }

  // Step 2 & 3: Get workspace + tier info in one query
  const { data: workspace } = await db
    .from("workspaces")
    .select("subscription_tier_key, subscription_limit_snapshot")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!workspace) return 0;

  // Step 2: Check the snapshot (limits locked in at last renewal)
  const snapshot = workspace.subscription_limit_snapshot as Record<string, number> | null;
  if (snapshot && Object.prototype.hasOwnProperty.call(snapshot, featureKey)) {
    return snapshot[featureKey];
  }

  // Step 3: Live tier limits
  const tierKey = (workspace.subscription_tier_key as string) || "starter";
  const { data: tier } = await db
    .from("subscription_tiers")
    .select("id")
    .eq("key", tierKey)
    .maybeSingle();

  if (!tier) return 0;

  const { data: featureLimit } = await db
    .from("tier_feature_limits")
    .select("limit_value")
    .eq("tier_id", tier.id)
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (featureLimit) {
    return featureLimit.limit_value as number;
  }

  // Step 4: Hard fallback — never silently allow unlimited access
  return 0;
}

/**
 * Returns ALL feature limits for a workspace at once (batched, 1 round trip each step).
 * More efficient than calling getFeatureLimit() for each key individually.
 */
export async function getAllFeatureLimits(
  workspaceId: string
): Promise<Record<string, number>> {
  if (await isAdminWorkspace(workspaceId)) {
    const unlimited: Record<string, number> = {};
    for (const key of Object.keys(FEATURE_LABELS)) {
      unlimited[key] = UNLIMITED;
    }
    return unlimited;
  }

  const db = createAdminClient();

  // Get workspace + overrides + tier in parallel
  const [workspaceRes, overridesRes] = await Promise.all([
    db
      .from("workspaces")
      .select("subscription_tier_key, subscription_limit_snapshot")
      .eq("id", workspaceId)
      .maybeSingle(),
    db
      .from("workspace_limit_overrides")
      .select("feature_key, override_limit_value, expires_at")
      .eq("workspace_id", workspaceId),
  ]);

  const workspace = workspaceRes.data;
  if (!workspace) return {};

  // Build override map (skip expired)
  const overrideMap: Record<string, number> = {};
  for (const ov of overridesRes.data ?? []) {
    if (!ov.expires_at || new Date(ov.expires_at) > new Date()) {
      overrideMap[ov.feature_key] = ov.override_limit_value as number;
    }
  }

  // Get live tier limits
  const tierKey = (workspace.subscription_tier_key as string) || "starter";
  const { data: tier } = await db
    .from("subscription_tiers")
    .select("id")
    .eq("key", tierKey)
    .maybeSingle();

  const liveLimits: Record<string, number> = {};
  if (tier) {
    const { data: rows } = await db
      .from("tier_feature_limits")
      .select("feature_key, limit_value")
      .eq("tier_id", tier.id);

    for (const row of rows ?? []) {
      liveLimits[row.feature_key] = row.limit_value as number;
    }
  }

  const snapshot = workspace.subscription_limit_snapshot as Record<string, number> | null;

  // Merge: overrides > snapshot > live > 0
  const allKeys = new Set([
    ...Object.keys(overrideMap),
    ...Object.keys(snapshot ?? {}),
    ...Object.keys(liveLimits),
    ...Object.keys(FEATURE_LABELS),
  ]);

  const result: Record<string, number> = {};
  for (const key of allKeys) {
    if (Object.prototype.hasOwnProperty.call(overrideMap, key)) {
      result[key] = overrideMap[key];
    } else if (snapshot && Object.prototype.hasOwnProperty.call(snapshot, key)) {
      result[key] = snapshot[key];
    } else if (Object.prototype.hasOwnProperty.call(liveLimits, key)) {
      result[key] = liveLimits[key];
    } else {
      result[key] = 0;
    }
  }

  return result;
}

/**
 * Snapshots the current live tier limits onto a workspace's subscription record.
 * Call this at signup and renewal to lock in the tier's current limits.
 */
export async function snapshotTierLimitsForWorkspace(
  workspaceId: string
): Promise<void> {
  const db = createAdminClient();

  const { data: workspace } = await db
    .from("workspaces")
    .select("subscription_tier_key")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!workspace) return;

  const tierKey = (workspace.subscription_tier_key as string) || "starter";
  const { data: tier } = await db
    .from("subscription_tiers")
    .select("id")
    .eq("key", tierKey)
    .maybeSingle();

  if (!tier) return;

  const { data: rows } = await db
    .from("tier_feature_limits")
    .select("feature_key, limit_value")
    .eq("tier_id", tier.id);

  const snapshot: Record<string, number> = {};
  for (const row of rows ?? []) {
    snapshot[row.feature_key] = row.limit_value as number;
  }

  await db
    .from("workspaces")
    .update({ subscription_limit_snapshot: snapshot })
    .eq("id", workspaceId);
}
