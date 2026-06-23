import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { joinedRowKey } from "@/lib/admin/supabase-joins";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = createAdminClient();

  // Tier subscriber counts
  const { data: workspaces, error: wsError } = await db
    .from("workspaces")
    .select("id, name, user_id, subscription_tier_key, subscription_limit_snapshot, created_at");

  if (wsError) {
    return NextResponse.json({ error: wsError.message }, { status: 500 });
  }

  // Count by tier
  const tierCounts: Record<string, number> = {};
  for (const ws of workspaces ?? []) {
    const key = (ws.subscription_tier_key as string) || "starter";
    tierCounts[key] = (tierCounts[key] ?? 0) + 1;
  }

  // Current month usage — analyses
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [analysesRes, comparisonsRes, briefsRes, deconstructionsRes, chatRes] = await Promise.all([
    db
      .from("analyses")
      .select("workspace_id, created_at")
      .gte("created_at", monthStart)
      .is("comparison_id", null), // exclude comparison analyses if flagged
    db
      .from("analyses")
      .select("workspace_id, created_at")
      .gte("created_at", monthStart)
      .not("comparison_id", "is", null),
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

  // Build usage map per workspace
  type UsageMap = Record<string, Record<string, number>>;
  const usageMap: UsageMap = {};

  function tally(rows: { workspace_id: string }[] | null, key: string) {
    for (const row of rows ?? []) {
      const wsId = row.workspace_id;
      if (!usageMap[wsId]) usageMap[wsId] = {};
      usageMap[wsId][key] = (usageMap[wsId][key] ?? 0) + 1;
    }
  }

  tally(analysesRes.data, "funnel_analyses");
  tally(comparisonsRes.data, "variant_comparisons");
  tally(briefsRes.data, "creative_briefs");
  tally(deconstructionsRes.data, "ad_deconstructions");
  tally(chatRes.data, "chat_messages");

  // Get all tiers for display
  const { data: tiers } = await db
    .from("subscription_tiers")
    .select("key, display_name")
    .order("sort_order");

  // Get all limits per tier
  const { data: allLimits } = await db
    .from("tier_feature_limits")
    .select("tier_id, feature_key, limit_value, subscription_tiers(key)");

  type TierLimitMap = Record<string, Record<string, number>>;
  const tierLimitMap: TierLimitMap = {};
  for (const row of allLimits ?? []) {
    const tierKey = joinedRowKey(
      row.subscription_tiers as { key: string } | { key: string }[] | null
    );
    if (!tierKey) continue;
    if (!tierLimitMap[tierKey]) tierLimitMap[tierKey] = {};
    tierLimitMap[tierKey][row.feature_key] = row.limit_value as number;
  }

  // Build per-workspace usage report
  const workspaceStats = (workspaces ?? []).map((ws) => {
    const tierKey = (ws.subscription_tier_key as string) || "starter";
    const limits = tierLimitMap[tierKey] ?? {};
    const usage = usageMap[ws.id] ?? {};
    return {
      workspace_id: ws.id,
      workspace_name: ws.name,
      subscription_tier_key: tierKey,
      usage,
      limits,
    };
  });

  return NextResponse.json({
    tierCounts,
    tiers: tiers ?? [],
    workspaceStats,
  });
}
