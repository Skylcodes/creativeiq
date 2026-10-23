import { NextResponse } from "next/server";
import { runAnalysisPipeline } from "@/lib/ai/pipeline";
import { runComparisonPipeline } from "@/lib/ai/comparison-pipeline";
import { purgeAnalysisCreativesAfterTerminalStatus } from "@/lib/analyses/creative-storage";
import { claimAnalysisWorkerLock } from "@/lib/analyses/worker-lock";
import {
  PIPELINE_DEADLINE_MS,
  withDeadline,
} from "@/lib/analyses/worker-reliability";
import { isValidInternalSecret } from "@/lib/internal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Analysis } from "@/lib/types/analysis";
import type { Workspace } from "@/lib/types/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  if (!isValidInternalSecret(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: analysisId } = await params;
  const workerStartedAt = Date.now();
  console.log(`[worker] start ${analysisId}`);

  const supabase = createAdminClient();

  const { data: analysisRow, error: analysisError } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", analysisId)
    .maybeSingle();

  if (analysisError || !analysisRow) {
    console.log(`[worker] end ${analysisId} ${Date.now() - workerStartedAt}ms not_found`);
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const analysis = analysisRow as Analysis;

  if (analysis.status === "completed" || analysis.status === "failed") {
    console.log(
      `[worker] end ${analysisId} ${Date.now() - workerStartedAt}ms skipped ${analysis.status}`
    );
    return NextResponse.json({ status: analysis.status });
  }

  const lockedAt = new Date().toISOString();
  const claimed = await claimAnalysisWorkerLock(supabase, analysisId, lockedAt);
  if (!claimed) {
    console.log(`[worker] end ${analysisId} ${Date.now() - workerStartedAt}ms skipped locked`);
    return NextResponse.json({ status: "already_running" });
  }

  const { data: workspaceRow, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", analysis.workspace_id)
    .maybeSingle();

  if (workspaceError || !workspaceRow) {
    await supabase
      .from("analyses")
      .update({
        status: "failed",
        error_message: "Workspace not found.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", analysisId);

    await purgeAnalysisCreativesAfterTerminalStatus(supabase, analysis);

    console.log(`[worker] end ${analysisId} ${Date.now() - workerStartedAt}ms failed workspace`);
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const workspace = workspaceRow as Workspace;

  try {
    if (analysis.analysis_mode === "comparison") {
      await withDeadline(runComparisonPipeline(supabase, analysis, workspace), PIPELINE_DEADLINE_MS);
    } else {
      await withDeadline(runAnalysisPipeline(supabase, analysis, workspace), PIPELINE_DEADLINE_MS);
    }
    console.log(`[worker] end ${analysisId} ${Date.now() - workerStartedAt}ms completed`);
    return NextResponse.json({ status: "completed" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Analysis failed unexpectedly.";

    await supabase
      .from("analyses")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", analysisId);

    // Delete creatives on failure too — result will never be produced from this upload.
    try {
      await purgeAnalysisCreativesAfterTerminalStatus(supabase, analysis);
    } catch (cleanupErr) {
      console.error(
        "[analyses/worker] creative cleanup failed:",
        cleanupErr instanceof Error ? cleanupErr.message : cleanupErr
      );
    }

    console.log(`[worker] end ${analysisId} ${Date.now() - workerStartedAt}ms failed`);
    return NextResponse.json({ status: "failed", error: message }, { status: 500 });
  }
}
