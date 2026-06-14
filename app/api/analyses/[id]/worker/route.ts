import { NextResponse } from "next/server";
import { runAnalysisPipeline } from "@/lib/ai/pipeline";
import { runComparisonPipeline } from "@/lib/ai/comparison-pipeline";
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
  const supabase = createAdminClient();

  const { data: analysisRow, error: analysisError } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", analysisId)
    .maybeSingle();

  if (analysisError || !analysisRow) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const analysis = analysisRow as Analysis;

  if (analysis.status === "completed") {
    return NextResponse.json({ status: "completed" });
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

    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const workspace = workspaceRow as Workspace;

  try {
    if (analysis.analysis_mode === "comparison") {
      await runComparisonPipeline(supabase, analysis, workspace);
    } else {
      await runAnalysisPipeline(supabase, analysis, workspace);
    }
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

    return NextResponse.json({ status: "failed", error: message }, { status: 500 });
  }
}
