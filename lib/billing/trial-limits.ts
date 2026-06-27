import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionFeature } from "@/lib/billing/account-types";
import {
  TRIAL_DURATION_DAYS,
  TRIAL_HARDWALL_FEATURES,
  TRIAL_LIMITS,
  TRIAL_WORKSPACE_LIMIT,
} from "@/lib/billing/config";

export type TrialConfig = {
  durationDays: number;
  limits: Record<string, number>;
  hardwallFeatures: ActionFeature[];
};

let cache: { expiresAt: number; config: TrialConfig } | null = null;
const CACHE_TTL_MS = 30_000;

function envFallbackConfig(): TrialConfig {
  return {
    durationDays: TRIAL_DURATION_DAYS,
    limits: {
      ...TRIAL_LIMITS,
      workspaces: TRIAL_WORKSPACE_LIMIT,
      user_seats: 1,
    },
    hardwallFeatures: TRIAL_HARDWALL_FEATURES,
  };
}

/** Clears the in-memory cache after admin saves trial settings. */
export function invalidateTrialConfigCache(): void {
  cache = null;
}

export async function getTrialConfig(): Promise<TrialConfig> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.config;
  }

  const fallback = envFallbackConfig();

  try {
    const db = createAdminClient();
    const [settingsRes, limitsRes] = await Promise.all([
      db.from("trial_settings").select("duration_days").limit(1).maybeSingle(),
      db
        .from("trial_feature_limits")
        .select("feature_key, limit_value, ends_trial_on_exhaust")
        .order("feature_key"),
    ]);

    if (settingsRes.error || limitsRes.error || !limitsRes.data?.length) {
      return fallback;
    }

    const limits: Record<string, number> = {};
    const hardwallFeatures: ActionFeature[] = [];

    for (const row of limitsRes.data) {
      const key = row.feature_key as string;
      limits[key] = row.limit_value as number;
      if (row.ends_trial_on_exhaust) {
        hardwallFeatures.push(key as ActionFeature);
      }
    }

    const config: TrialConfig = {
      durationDays: (settingsRes.data?.duration_days as number) ?? fallback.durationDays,
      limits: { ...fallback.limits, ...limits },
      hardwallFeatures: hardwallFeatures.length
        ? hardwallFeatures
        : fallback.hardwallFeatures,
    };

    cache = { expiresAt: Date.now() + CACHE_TTL_MS, config };
    return config;
  } catch {
    return fallback;
  }
}

export async function getTrialFeatureLimit(feature: ActionFeature): Promise<number> {
  const { limits } = await getTrialConfig();
  return limits[feature] ?? TRIAL_LIMITS[feature] ?? 0;
}

export async function getTrialWorkspaceLimit(): Promise<number> {
  const { limits } = await getTrialConfig();
  return limits.workspaces ?? TRIAL_WORKSPACE_LIMIT;
}

export async function getTrialHardwallFeatures(): Promise<ActionFeature[]> {
  const { hardwallFeatures } = await getTrialConfig();
  return hardwallFeatures;
}
