import { NextResponse } from "next/server";
import { triggerBackgroundWorker } from "@/lib/trigger-worker";
import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types/workspace";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { id: workspaceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: workspaceRow, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !workspaceRow) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const workspace = workspaceRow as Workspace;

  if (workspace.brand_profile_status === "complete" && workspace.brand_profile) {
    return NextResponse.json({ status: "complete" });
  }

  if (workspace.brand_profile_status !== "processing") {
    await supabase
      .from("workspaces")
      .update({
        brand_profile_status: "processing",
        brand_profile_error: null,
        brand_profile_progress: {
          step: "scrape",
          message: "Crawling your website…",
          percent: 10,
        },
      })
      .eq("id", workspaceId);
  }

  triggerBackgroundWorker(
    request,
    `/api/workspaces/${workspaceId}/brand-profile/worker`
  );

  return NextResponse.json({ status: "processing" });
}
