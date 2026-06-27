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

  const [profilesRes, workspacesRes, tiersRes, limitsRes, overridesRes, analysesRes, briefsRes, deconstructionsRes, chatRes] =
    await Promise.all([
      db
        .from("profiles")
        .select("id, subscription_tier_key, subscription_limit_snapshot"),
      db
        .from("workspaces")
        .select("id, name, user_id")
        .order("name"),
      db
        .from("subscription_tiers")
        .select("id, key, display_name")
        .order("sort_order"),
      db
        .from("tier_feature_limits")
        .select("tier_id, feature_key, limit_value, subscription_tiers(key)"),
      db
        .from("account_limit_overrides")
        .select("user_id, feature_key, override_limit_value, expires_at"),
      db
        .from("analyses")
        .select("user_id, analysis_mode, created_at")
        .gte("created_at", monthStart),
      db
        .from("creative_briefs")
        .select("user_id, created_at")
        .gte("created_at", monthStart),
      db
        .from("ad_deconstructions")
        .select("user_id, created_at")
        .gte("created_at", monthStart),
      db
        .from("creative_director_messages")
        .select("role, created_at, creative_director_chats!inner(user_id)")
        .eq("role", "user")
        .gte("created_at", todayStart),
    ]);

  const tierCounts: Record<string, number> = {};
  for (const p of profilesRes.data ?? []) {
    const k = (p.subscription_tier_key as string) || "starter";
    if (p.subscription_tier_key) {
      tierCounts[k] = (tierCounts[k] ?? 0) + 1;
    }
  }

  type UsageRecord = Record<string, number>;
  const usageByUser: Record<string, UsageRecord> = {};

  function bump(userId: string, key: string) {
    if (!usageByUser[userId]) usageByUser[userId] = {};
    usageByUser[userId][key] = (usageByUser[userId][key] ?? 0) + 1;
  }

  for (const row of analysesRes.data ?? []) {
    const userId = row.user_id as string;
    if (!userId) continue;
    if (row.analysis_mode === "comparison") {
      bump(userId, "variant_comparisons");
    } else {
      bump(userId, "funnel_analyses");
    }
  }

  for (const row of briefsRes.data ?? []) {
    if (row.user_id) bump(row.user_id as string, "creative_briefs");
  }

  for (const row of deconstructionsRes.data ?? []) {
    if (row.user_id) bump(row.user_id as string, "ad_deconstructions");
  }

  for (const row of chatRes.data ?? []) {
    const chat = row.creative_director_chats as { user_id: string } | { user_id: string }[];
    const userId = Array.isArray(chat) ? chat[0]?.user_id : chat?.user_id;
    if (userId) bump(userId, "chat_messages");
  }

  const workspaceCountByUser: Record<string, number> = {};
  for (const ws of workspacesRes.data ?? []) {
    const userId = ws.user_id as string;
    workspaceCountByUser[userId] = (workspaceCountByUser[userId] ?? 0) + 1;
  }

  const overridesByUser: Record<string, Record<string, number>> = {};
  for (const row of overridesRes.data ?? []) {
    const expiresAt = row.expires_at as string | null;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) continue;
    const userId = row.user_id as string;
    if (!overridesByUser[userId]) overridesByUser[userId] = {};
    overridesByUser[userId][row.feature_key as string] = row.override_limit_value as number;
  }

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

  const profileById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id as string, p])
  );

  const accountStats = Object.keys(usageByUser).map((userId) => {
    const profile = profileById.get(userId);
    const tierKey = (profile?.subscription_tier_key as string) || "starter";
    const snapshot = profile?.subscription_limit_snapshot as Record<string, number> | null;
    const limits = {
      ...(snapshot ?? tierLimitMap[tierKey] ?? {}),
      ...overridesByUser[userId],
    };
    const usage = { ...usageByUser[userId] };
    usage.workspaces = workspaceCountByUser[userId] ?? 0;

    const workspaceNames = (workspacesRes.data ?? [])
      .filter((w) => w.user_id === userId)
      .map((w) => w.name as string);

    return {
      account_id: userId,
      account_label:
        workspaceNames.length > 0
          ? `${workspaceNames[0]}${workspaceNames.length > 1 ? ` +${workspaceNames.length - 1}` : ""}`
          : userId.slice(0, 8),
      workspace_count: workspaceNames.length,
      subscription_tier_key: tierKey,
      usage,
      limits,
    };
  });

  return (
    <UsageDashboard
      tiers={(tiersRes.data ?? []) as { id: string; key: string; display_name: string }[]}
      tierCounts={tierCounts}
      accountStats={accountStats}
      featureLabels={FEATURE_LABELS}
    />
  );
}
