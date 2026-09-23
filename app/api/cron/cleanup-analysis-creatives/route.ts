import { NextResponse } from "next/server";
import { cleanupOrphanedAnalysisCreatives } from "@/lib/analyses/cleanup-creatives";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily backstop for orphaned creatives in `analysis-creatives`.
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
 * Also accepts `x-internal-secret` matching INTERNAL_API_SECRET for manual runs.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const internal = request.headers.get("x-internal-secret");

  const authorized =
    (cronSecret && auth === `Bearer ${cronSecret}`) ||
    (internalSecret && internal === internalSecret);

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const result = await cleanupOrphanedAnalysisCreatives(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed";
    console.error("[cron/cleanup-analysis-creatives]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
