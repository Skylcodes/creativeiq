import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BrandProfileProgress, BrandProfileStatus } from "@/lib/types/report";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id: workspaceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("workspaces")
    .select(
      "brand_profile_status, brand_profile_progress, brand_profile_error, brand_profile, brand_profile_generated_at"
    )
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: data.brand_profile_status as BrandProfileStatus,
    progress: data.brand_profile_progress as BrandProfileProgress | null,
    error: data.brand_profile_error as string | null,
    hasProfile: Boolean(data.brand_profile),
    profile: data.brand_profile,
    updatedAt: data.brand_profile_generated_at as string | null,
  });
}
