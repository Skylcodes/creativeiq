import { NextResponse } from "next/server";
import { triggerBackgroundWorker } from "@/lib/trigger-worker";
import { createClient } from "@/lib/supabase/server";
import type { Analysis } from "@/lib/types/analysis";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: analysisRow, error: analysisError } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (analysisError || !analysisRow) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const analysis = analysisRow as Analysis;

  if (analysis.status === "completed") {
    return NextResponse.json({ status: "completed", analysisId: id });
  }

  const now = new Date().toISOString();

  if (analysis.status !== "processing") {
    await supabase
      .from("analyses")
      .update({
        status: "processing",
        error_message: null,
        processing_started_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", user.id);
  } else if (!analysis.processing_started_at) {
    await supabase
      .from("analyses")
      .update({
        processing_started_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  triggerBackgroundWorker(request, `/api/analyses/${id}/worker`);

  return NextResponse.json({ status: "processing", analysisId: id });
}
