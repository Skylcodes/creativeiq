import { NextResponse } from "next/server";
import { triggerBackgroundWorker } from "@/lib/trigger-worker";
import { createClient } from "@/lib/supabase/server";
import { assertActionAllowed, blockedResponse } from "@/lib/billing/gate";
import type { AdDeconstruction } from "@/lib/types/deconstruction";

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

  const { data: row, error: fetchError } = await supabase
    .from("ad_deconstructions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deconstruction = row as AdDeconstruction;

  if (deconstruction.status === "completed") {
    return NextResponse.json({ status: "completed", id });
  }

  const gate = await assertActionAllowed(user.id, "ad_deconstructions", {
    countTrial: false,
  });
  if (!gate.allowed) return blockedResponse(gate);

  const now = new Date().toISOString();

  await supabase
    .from("ad_deconstructions")
    .update({
      status: "processing",
      error_message: null,
      processing_started_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  triggerBackgroundWorker(request, `/api/deconstructions/${id}/worker`);

  return NextResponse.json({ status: "processing", id });
}
