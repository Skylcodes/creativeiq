import { NextResponse } from "next/server";
import { expireStuckAnalyses } from "@/lib/analyses/watchdog";
import { decideProcessingHeal } from "@/lib/analyses/status-heal";
import { triggerBackgroundWorker } from "@/lib/trigger-worker";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Analysis } from "@/lib/types/analysis";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const STATUS_COLUMNS =
  "id, status, error_message, processing_started_at, updated_at, worker_locked_at, worker_retriggered_at, user_id";

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("analyses")
    .select(STATUS_COLUMNS)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const analysis = row as Pick<
    Analysis,
    | "id"
    | "status"
    | "error_message"
    | "processing_started_at"
    | "updated_at"
    | "worker_locked_at"
    | "worker_retriggered_at"
    | "user_id"
  >;

  let retriggered = false;
  const decision = decideProcessingHeal(analysis);

  if (decision === "expire") {
    await expireStuckAnalyses(supabase, {
      analysisId: analysis.id,
      userId: user.id,
    });
  } else if (decision === "retrigger") {
    const now = new Date().toISOString();
    const { data: marked } = await supabase
      .from("analyses")
      .update({
        worker_retriggered_at: now,
        updated_at: now,
      })
      .eq("id", analysis.id)
      .eq("status", "processing")
      .is("worker_locked_at", null)
      .is("worker_retriggered_at", null)
      .select("id")
      .maybeSingle();

    if (marked) {
      triggerBackgroundWorker(request, `/api/analyses/${analysis.id}/worker`);
      retriggered = true;
    }
  }

  const { data: latest } = await supabase
    .from("analyses")
    .select("status, error_message")
    .eq("id", analysis.id)
    .maybeSingle();

  return NextResponse.json({
    status: latest?.status ?? analysis.status,
    error_message: latest?.error_message ?? analysis.error_message ?? null,
    retriggered,
  });
}
