import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export type AdminUserOption = {
  id: string;
  email: string;
  label: string;
  subscription_tier_key: string | null;
};

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const db = createAdminClient();

  if (!q) {
    return NextResponse.json({ users: [] });
  }

  const { data: profiles } = await db
    .from("profiles")
    .select("id, subscription_tier_key")
    .limit(200);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      (p.subscription_tier_key as string | null) ?? null,
    ])
  );

  const { data: workspaces } = await db
    .from("workspaces")
    .select("user_id, name")
    .ilike("name", `%${q}%`)
    .limit(40);

  const workspaceLabels = new Map<string, string>();
  for (const ws of workspaces ?? []) {
    const userId = ws.user_id as string;
    if (!workspaceLabels.has(userId)) {
      workspaceLabels.set(userId, ws.name as string);
    }
  }

  const { data: authData, error: authError } = await db.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const users: AdminUserOption[] = [];

  for (const user of authData.users) {
    const email = user.email ?? "";
    const emailMatch = email.toLowerCase().includes(q);
    const workspaceLabel = workspaceLabels.get(user.id);
    const nameMatch = workspaceLabel?.toLowerCase().includes(q);

    if (!emailMatch && !nameMatch) continue;

    users.push({
      id: user.id,
      email,
      label: workspaceLabel ?? email.split("@")[0] ?? user.id.slice(0, 8),
      subscription_tier_key: profileMap.get(user.id) ?? null,
    });

    if (users.length >= 20) break;
  }

  return NextResponse.json({ users });
}
