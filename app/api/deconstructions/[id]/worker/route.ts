import { NextResponse } from "next/server";
import { runDeconstructionPipeline } from "@/lib/ai/deconstruction-pipeline";
import { isValidInternalSecret } from "@/lib/internal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdDeconstruction } from "@/lib/types/deconstruction";
import type { Workspace } from "@/lib/types/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  if (!isValidInternalSecret(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: row, error: fetchError } = await supabase
    .from("ad_deconstructions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deconstruction = row as AdDeconstruction;

  if (deconstruction.status === "completed") {
    return NextResponse.json({ status: "completed" });
  }

  const { data: workspaceRow, error: workspaceError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", deconstruction.workspace_id)
    .maybeSingle();

  if (workspaceError || !workspaceRow) {
    await supabase
      .from("ad_deconstructions")
      .update({
        status: "failed",
        error_message: "Workspace not found.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    await runDeconstructionPipeline(
      supabase,
      deconstruction,
      workspaceRow as Workspace
    );
    return NextResponse.json({ status: "completed" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Deconstruction failed unexpectedly.";

    await supabase
      .from("ad_deconstructions")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ status: "failed", error: message }, { status: 500 });
  }
}
