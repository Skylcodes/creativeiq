import { createAdminClient } from "@/lib/supabase/admin";
import { OverridesPanel } from "@/components/admin/overrides-panel";

export const dynamic = "force-dynamic";

export default async function AdminOverridesPage() {
  const db = createAdminClient();

  const { data: overrides } = await db
    .from("account_limit_overrides")
    .select(
      "id, user_id, feature_key, override_limit_value, reason, expires_at, created_at"
    )
    .order("created_at", { ascending: false });

  const userIds = [...new Set((overrides ?? []).map((o) => o.user_id as string))];
  const emailByUserId = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: authData } = await db.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    for (const user of authData?.users ?? []) {
      if (userIds.includes(user.id) && user.email) {
        emailByUserId.set(user.id, user.email);
      }
    }
  }

  const withEmails = (overrides ?? []).map((row) => ({
    ...row,
    account_email: emailByUserId.get(row.user_id as string) ?? null,
  }));

  return <OverridesPanel initialOverrides={withEmails} />;
}
