import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { setAccountStatus } from "@/lib/billing/account";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = createAdminClient();

  const { data, error } = await db
    .from("account_limit_overrides")
    .select(
      `
      id,
      user_id,
      feature_key,
      override_limit_value,
      reason,
      expires_at,
      created_at
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((data ?? []).map((row) => row.user_id as string))];
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

  const overrides = (data ?? []).map((row) => ({
    ...row,
    account_email: emailByUserId.get(row.user_id as string) ?? null,
  }));

  return NextResponse.json({ overrides });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    user_id?: string;
    feature_key?: string;
    override_limit_value?: number;
    reason?: string;
    expires_at?: string | null;
  };

  if (!body.user_id || !body.feature_key || body.override_limit_value === undefined) {
    return NextResponse.json(
      { error: "user_id, feature_key, and override_limit_value are required" },
      { status: 400 }
    );
  }

  const db = createAdminClient();

  const { data, error } = await db
    .from("account_limit_overrides")
    .upsert(
      {
        user_id: body.user_id,
        feature_key: body.feature_key,
        override_limit_value: body.override_limit_value,
        reason: body.reason ?? "",
        expires_at: body.expires_at ?? null,
      },
      { onConflict: "user_id,feature_key" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If this account was hardwalled by trial exhaustion, reopen the trial
  // window when an admin raises an allowance and the trial hasn't expired.
  const { data: profile } = await db
    .from("profiles")
    .select("account_status, stripe_subscription_id, trial_ends_at")
    .eq("id", body.user_id)
    .maybeSingle();

  if (
    profile?.account_status === "paywalled" &&
    !profile.stripe_subscription_id &&
    body.override_limit_value !== 0 &&
    (!profile.trial_ends_at ||
      new Date(profile.trial_ends_at as string).getTime() > Date.now())
  ) {
    await setAccountStatus(body.user_id, "trialing");
  }

  const { data: userData } = await db.auth.admin.getUserById(body.user_id);

  return NextResponse.json({
    override: {
      ...data,
      account_email: userData.user?.email ?? null,
    },
  });
}
