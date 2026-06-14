import { NextResponse } from "next/server";
import { runBriefPipeline } from "@/lib/ai/brief-pipeline";
import { isValidInternalSecret } from "@/lib/internal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreativeBrief } from "@/lib/types/brief";
import type { Workspace } from "@/lib/types/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  if (!isValidInternalSecret(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: briefId } = await params;
  const supabase = createAdminClient();

  const { data: briefRow, error: briefError } = await supabase
    .from("creative_briefs")
    .select("*")
    .eq("id", briefId)
    .maybeSingle();

  if (briefError || !briefRow) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  const brief = briefRow as CreativeBrief;

  if (brief.status === "completed") {
    return NextResponse.json({ status: "completed" });
  }

  const { data: workspaceRow, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", brief.workspace_id)
    .maybeSingle();

  if (workspaceError || !workspaceRow) {
    await supabase
      .from("creative_briefs")
      .update({
        status: "failed",
        error_message: "Workspace not found.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", briefId);

    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    await runBriefPipeline(supabase, brief, workspaceRow as Workspace);
    return NextResponse.json({ status: "completed" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Brief generation failed unexpectedly.";

    await supabase
      .from("creative_briefs")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", briefId);

    return NextResponse.json({ status: "failed", error: message }, { status: 500 });
  }
}
