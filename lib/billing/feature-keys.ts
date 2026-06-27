/**
 * Client-safe feature key constants — no server-only imports.
 * Import this from client components; import feature-limits.ts for server-side logic.
 */

export type FeatureKey =
  | "funnel_analyses"
  | "variant_comparisons"
  | "creative_briefs"
  | "ad_deconstructions"
  | "chat_messages"
  | "workspaces"
  | "user_seats";

/** Human-readable labels for feature keys — used on pricing page + admin UI */
export const FEATURE_LABELS: Record<string, string> = {
  funnel_analyses: "Funnel Analyses / month",
  variant_comparisons: "Variant Comparisons / month",
  creative_briefs: "Creative Briefs / month",
  ad_deconstructions: "Ad Deconstructions / month",
  chat_messages: "Chat Messages / day",
  workspaces: "Brand Workspaces",
  user_seats: "User Seats",
};

/** Feature keys shown on the public pricing page, in display order */
export const PRICING_FEATURE_KEYS = [
  "funnel_analyses",
  "variant_comparisons",
  "creative_briefs",
  "ad_deconstructions",
  "chat_messages",
  "workspaces",
  "user_seats",
] as const;

export function formatFeatureLimit(value: number): string {
  if (value === -1) return "Unlimited";
  return value.toLocaleString();
}

/** Default reset period for each known feature key */
export const FEATURE_RESET_PERIODS: Record<string, "monthly" | "daily" | "lifetime"> = {
  funnel_analyses: "monthly",
  variant_comparisons: "monthly",
  creative_briefs: "monthly",
  ad_deconstructions: "monthly",
  chat_messages: "daily",
  workspaces: "lifetime",
  user_seats: "lifetime",
};
