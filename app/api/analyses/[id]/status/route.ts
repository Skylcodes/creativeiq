import { NextResponse } from "next/server";
import { healProcessingAnalysis } from "@/lib/analyses/heal-analysis";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisWorkerSnapshot } from "@/lib/analyses/worker-reliability";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: analysisRow, error } = await supabase
    .from("analyses")
    .select("id, status, error_message, processing_started_at, updated_at, worker_locked_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !analysisRow) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const snapshot = analysisRow as AnalysisWorkerSnapshot;
  let retriggered = false;

  if (snapshot.status === "processing") {
    const admin = createAdminClient();
    const action = await healProcessingAnalysis({
      supabase: admin,
      request,
      row: snapshot,
      userId: user.id,
    });
    retriggered = action === "retrigger";

    const { data: refreshed } = await supabase
      .from("analyses")
      .select("status, error_message")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      status: refreshed?.status ?? snapshot.status,
      error_message: refreshed?.error_message ?? snapshot.error_message ?? null,
      retriggered,
    });
  }

  return NextResponse.json({
    status: snapshot.status,
    error_message: snapshot.error_message ?? null,
    retriggered,
  });
}
