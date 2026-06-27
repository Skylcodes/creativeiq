/** Client-safe types for account usage UI (mirrors server summary shape). */

export type UsageFeatureRow = {
  key: string;
  label: string;
  used: number;
  limit: number;
  resetPeriod: "monthly" | "daily" | "lifetime";
  unlimited: boolean;
};

export type AccountUsageSummary = {
  accountStatus: string;
  isAdmin: boolean;
  /** True when the account has (or had) a Stripe subscription on file. */
  hasPaidSubscription: boolean;
  trialDaysLeft: number | null;
  planKey: string | null;
  planDisplayName: string;
  planPriceMonthly: number | null;
  workspaceCount: number;
  features: UsageFeatureRow[];
};

export function isAtWorkspaceLimit(summary: AccountUsageSummary): boolean {
  const row = summary.features.find((f) => f.key === "workspaces");
  if (!row || row.unlimited) return false;
  return row.used >= row.limit;
}
