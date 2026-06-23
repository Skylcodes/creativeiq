import { createAdminClient } from "@/lib/supabase/admin";
import { OverridesPanel } from "@/components/admin/overrides-panel";

export const dynamic = "force-dynamic";

export default async function AdminOverridesPage() {
  const db = createAdminClient();

  const { data: overrides } = await db
    .from("workspace_limit_overrides")
    .select(
      `id, workspace_id, feature_key, override_limit_value, reason, expires_at, created_at,
       workspaces ( name, user_id )`
    )
    .order("created_at", { ascending: false });

  return <OverridesPanel initialOverrides={overrides ?? []} />;
}
