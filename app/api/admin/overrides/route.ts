import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = createAdminClient();

  const { data, error } = await db
    .from("workspace_limit_overrides")
    .select(
      `
      id,
      workspace_id,
      feature_key,
      override_limit_value,
      reason,
      expires_at,
      created_at,
      workspaces ( name, user_id )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ overrides: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    workspace_id?: string;
    feature_key?: string;
    override_limit_value?: number;
    reason?: string;
    expires_at?: string | null;
  };

  if (!body.workspace_id || !body.feature_key || body.override_limit_value === undefined) {
    return NextResponse.json(
      { error: "workspace_id, feature_key, and override_limit_value are required" },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  const { data, error } = await db
    .from("workspace_limit_overrides")
    .upsert(
      {
        workspace_id: body.workspace_id,
        feature_key: body.feature_key,
        override_limit_value: body.override_limit_value,
        reason: body.reason ?? "",
        expires_at: body.expires_at ?? null,
      },
      { onConflict: "workspace_id,feature_key" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ override: data });
}
