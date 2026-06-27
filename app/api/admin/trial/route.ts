import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { invalidateTrialConfigCache } from "@/lib/billing/trial-limits";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const db = createAdminClient();

  const [settingsRes, limitsRes] = await Promise.all([
    db.from("trial_settings").select("*").limit(1).maybeSingle(),
    db
      .from("trial_feature_limits")
      .select("*")
      .order("feature_key", { ascending: true }),
  ]);

  if (settingsRes.error) {
    return NextResponse.json({ error: settingsRes.error.message }, { status: 500 });
  }
  if (limitsRes.error) {
    return NextResponse.json({ error: limitsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: settingsRes.data,
    limits: limitsRes.data ?? [],
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as {
    duration_days?: number;
    limits?: Array<{
      feature_key: string;
      limit_value: number;
      reset_period: string;
      ends_trial_on_exhaust?: boolean;
    }>;
  };

  const db = createAdminClient();
  const now = new Date().toISOString();

  if (body.duration_days !== undefined) {
    const days = Math.min(90, Math.max(1, Math.round(body.duration_days)));

    const { data: existing } = await db
      .from("trial_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await db
        .from("trial_settings")
        .update({ duration_days: days, updated_at: now })
        .eq("id", existing.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await db
        .from("trial_settings")
        .insert({ duration_days: days, updated_at: now });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  if (body.limits?.length) {
    const upserts = body.limits.map((l) => ({
      feature_key: l.feature_key,
      limit_value: l.limit_value,
      reset_period: l.reset_period,
      ends_trial_on_exhaust: Boolean(l.ends_trial_on_exhaust),
      updated_at: now,
    }));

    const { error } = await db
      .from("trial_feature_limits")
      .upsert(upserts, { onConflict: "feature_key" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  invalidateTrialConfigCache();

  const [settingsRes, limitsRes] = await Promise.all([
    db.from("trial_settings").select("*").limit(1).maybeSingle(),
    db
      .from("trial_feature_limits")
      .select("*")
      .order("feature_key", { ascending: true }),
  ]);

  return NextResponse.json({
    settings: settingsRes.data,
    limits: limitsRes.data ?? [],
  });
}
