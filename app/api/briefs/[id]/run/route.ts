import { NextResponse } from "next/server";
import { triggerBackgroundWorker } from "@/lib/trigger-worker";
import { createClient } from "@/lib/supabase/server";
import { assertActionAllowed, blockedResponse } from "@/lib/billing/gate";
import type { CreativeBrief } from "@/lib/types/brief";

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

  const { data: briefRow, error: briefError } = await supabase
    .from("creative_briefs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (briefError || !briefRow) {
    return NextResponse.json({ error: "Brief not found" }, { status: 404 });
  }

  const brief = briefRow as CreativeBrief;

  if (brief.status === "completed") {
    return NextResponse.json({ status: "completed", briefId: id });
  }

  const gate = await assertActionAllowed(user.id, "creative_briefs", {
    countTrial: false,
  });
  if (!gate.allowed) return blockedResponse(gate);

  const now = new Date().toISOString();

  if (brief.status !== "processing") {
    await supabase
      .from("creative_briefs")
      .update({
        status: "processing",
        error_message: null,
        processing_started_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", user.id);
  } else if (!brief.processing_started_at) {
    await supabase
      .from("creative_briefs")
      .update({
        processing_started_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  triggerBackgroundWorker(request, `/api/briefs/${id}/worker`);

  return NextResponse.json({ status: "processing", briefId: id });
}
