import { createAdminClient } from "@/lib/supabase/admin";
import { UsageDashboard } from "@/components/admin/usage-dashboard";
import { FEATURE_LABELS } from "@/lib/billing/feature-keys";
import { joinedRowKey } from "@/lib/admin/supabase-joins";

export const dynamic = "force-dynamic";

export default async function AdminUsagePage() {
  const db = createAdminClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).toISOString();

  const [workspacesRes, tiersRes, limitsRes, analysesRes, briefsRes, deconstructionsRes, chatRes] =
    await Promise.all([
      db
        .from("workspaces")
        .select("id, name, subscription_tier_key")
        .order("name"),
      db
        .from("subscription_tiers")
        .select("id, key, display_name")
        .order("sort_order"),
      db
        .from("tier_feature_limits")
        .select("tier_id, feature_key, limit_value, subscription_tiers(key)"),
      db
        .from("analyses")
        .select("workspace_id, comparison_id, created_at")
        .gte("created_at", monthStart),
      db
        .from("briefs")
        .select("workspace_id, created_at")
        .gte("created_at", monthStart),
      db
        .from("ad_deconstructions")
        .select("workspace_id, created_at")
        .gte("created_at", monthStart),
      db
        .from("chat_messages")
        .select("workspace_id, created_at")
        .gte("created_at", todayStart),
    ]);

  // Tier subscriber counts
  const tierCounts: Record<string, number> = {};
  for (const ws of workspacesRes.data ?? []) {
    const k = (ws.subscription_tier_key as string) || "starter";
    tierCounts[k] = (tierCounts[k] ?? 0) + 1;
  }

  // Build usage map per workspace
  type UsageRecord = Record<string, number>;
  const usageMap: Record<string, UsageRecord> = {};

  function tally(
    rows: Array<{ workspace_id: string; comparison_id?: string | null }> | null,
    key: string,
    excludeComparisons = false
  ) {
    for (const row of rows ?? []) {
      if (excludeComparisons && row.comparison_id) continue;
      const wsId = row.workspace_id;
      if (!usageMap[wsId]) usageMap[wsId] = {};
      usageMap[wsId][key] = (usageMap[wsId][key] ?? 0) + 1;
    }
  }

  tally(analysesRes.data, "funnel_analyses", true);
  tally(
    (analysesRes.data ?? []).filter((a) => !!a.comparison_id),
    "variant_comparisons"
  );
  tally(briefsRes.data, "creative_briefs");
  tally(deconstructionsRes.data, "ad_deconstructions");
  tally(chatRes.data, "chat_messages");

  // Tier limit map
  type TierLimits = Record<string, Record<string, number>>;
  const tierLimitMap: TierLimits = {};
  for (const row of limitsRes.data ?? []) {
    const k = joinedRowKey(
      row.subscription_tiers as { key: string } | { key: string }[] | null
    );
    if (!k) continue;
    if (!tierLimitMap[k]) tierLimitMap[k] = {};
    tierLimitMap[k][row.feature_key] = row.limit_value as number;
  }

  const workspaceStats = (workspacesRes.data ?? []).map((ws) => {
    const tierKey = (ws.subscription_tier_key as string) || "starter";
    return {
      workspace_id: ws.id,
      workspace_name: ws.name as string,
      subscription_tier_key: tierKey,
      usage: usageMap[ws.id] ?? {},
      limits: tierLimitMap[tierKey] ?? {},
    };
  });

  return (
    <UsageDashboard
      tiers={(tiersRes.data ?? []) as { id: string; key: string; display_name: string }[]}
      tierCounts={tierCounts}
      workspaceStats={workspaceStats}
      featureLabels={FEATURE_LABELS}
    />
  );
}
