import { NextResponse } from "next/server";
import { triggerBackgroundWorker } from "@/lib/trigger-worker";
import { createClient } from "@/lib/supabase/server";
import {
  isValidBrandUrl,
  normalizeBrandUrl,
} from "@/lib/workspaces/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Forces a fresh scrape + AI regeneration, replacing the current profile.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const { id: workspaceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    websiteUrl?: string;
  };

  const { data: workspaceRow, error } = await supabase
    .from("workspaces")
    .select("id, brand_url")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !workspaceRow) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  let brandUrl = workspaceRow.brand_url;

  if (body.websiteUrl?.trim()) {
    if (!isValidBrandUrl(body.websiteUrl)) {
      return NextResponse.json(
        { error: "Enter a valid website URL before refreshing." },
        { status: 400 }
      );
    }
    brandUrl = normalizeBrandUrl(body.websiteUrl);
  }

  await supabase
    .from("workspaces")
    .update({
      brand_url: brandUrl,
      brand_profile_status: "processing",
      brand_profile_error: null,
      brand_profile_progress: {
        step: "scrape",
        message: "Crawling your website…",
        percent: 10,
      },
    })
    .eq("id", workspaceId);

  triggerBackgroundWorker(
    request,
    `/api/workspaces/${workspaceId}/brand-profile/worker`
  );

  return NextResponse.json({ status: "processing" });
}
