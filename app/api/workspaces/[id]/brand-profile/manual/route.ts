import { NextResponse } from "next/server";
import { saveManualBrandProfile } from "@/lib/ai/brand-profile";
import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

  const body = (await request.json()) as { description?: string };
  const description = body.description?.trim() ?? "";

  if (description.length < 50) {
    return NextResponse.json(
      { error: "Please provide at least 50 characters describing your brand." },
      { status: 400 }
    );
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

  try {
    const profile = await saveManualBrandProfile(
      supabase,
      workspace,
      description
    );
    return NextResponse.json({ status: "complete", profile });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save brand profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
