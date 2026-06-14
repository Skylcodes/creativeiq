import { NextResponse } from "next/server";
import { runBrandProfileGeneration } from "@/lib/ai/brand-profile";
import { isValidInternalSecret } from "@/lib/internal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Workspace } from "@/lib/types/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  if (!isValidInternalSecret(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: workspaceId } = await params;
  const supabase = createAdminClient();

  const { data: workspaceRow, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error || !workspaceRow) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const workspace = workspaceRow as Workspace;

  if (workspace.brand_profile_status === "complete" && workspace.brand_profile) {
    return NextResponse.json({ status: "complete" });
  }

  try {
    await runBrandProfileGeneration(supabase, workspace);
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Brand profile generation failed.";

    await supabase
      .from("workspaces")
      .update({
        brand_profile_status: "manual_required",
        brand_profile_error: message,
        brand_profile_progress: {
          step: "manual",
          message: "We need your help to describe your brand",
          percent: 0,
        },
      })
      .eq("id", workspaceId);

    return NextResponse.json({ status: "failed", error: message }, { status: 500 });
  }
}
