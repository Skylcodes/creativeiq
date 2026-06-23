import { createAdminClient } from "@/lib/supabase/admin";
import { TiersPanel } from "@/components/admin/tiers-panel";

export const dynamic = "force-dynamic";

export default async function AdminTiersPage() {
  const db = createAdminClient();

  const [tiersRes, limitsRes] = await Promise.all([
    db
      .from("subscription_tiers")
      .select("*")
      .order("sort_order", { ascending: true }),
    db
      .from("tier_feature_limits")
      .select("*")
      .order("feature_key", { ascending: true }),
  ]);

  return (
    <TiersPanel
      initialTiers={tiersRes.data ?? []}
      initialLimits={limitsRes.data ?? []}
    />
  );
}
