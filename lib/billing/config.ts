/**
 * Billing config — client-safe constants (no server-only imports).
 *
 * Trial limits and duration are admin-configurable in the database
 * (Admin → Plans & Limits). Env vars below are fallbacks when the DB
 * tables are unavailable or not yet migrated.
 */

import type { ActionFeature } from "@/lib/billing/account-types";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Length of the free trial in days. */
export const TRIAL_DURATION_DAYS = envInt("TRIAL_DURATION_DAYS", 14);

/** Brand workspaces allowed during the free trial (lifetime cap). */
export const TRIAL_WORKSPACE_LIMIT = envInt("TRIAL_WORKSPACE_LIMIT", 1);

/** Grace period (days) after a failed renewal before messaging hardens. */
export const PAYMENT_GRACE_DAYS = envInt("PAYMENT_GRACE_DAYS", 5);

/**
 * Fixed trial allowances. A feature with limit 0 is not usable during trial
 * (attempting it routes the user straight to the upgrade prompt). -1 = unlimited.
 * chat_messages is a daily allowance so the strategist is explorable on trial.
 */
export const TRIAL_LIMITS: Record<ActionFeature, number> = {
  funnel_analyses: envInt("TRIAL_LIMIT_FUNNEL_ANALYSES", 2),
  creative_briefs: envInt("TRIAL_LIMIT_CREATIVE_BRIEFS", 1),
  variant_comparisons: envInt("TRIAL_LIMIT_VARIANT_COMPARISONS", 0),
  ad_deconstructions: envInt("TRIAL_LIMIT_AD_DECONSTRUCTIONS", 0),
  chat_messages: envInt("TRIAL_LIMIT_CHAT_MESSAGES", 20),
};

/**
 * Hitting the cap on these features ends the trial entirely (→ paywalled),
 * because they are the headline "aha" actions. Exceeding a 0-limit trial
 * feature (e.g. comparisons) only blocks that feature, not the whole trial.
 */
export const TRIAL_HARDWALL_FEATURES: ActionFeature[] = [
  "funnel_analyses",
  "creative_briefs",
];
