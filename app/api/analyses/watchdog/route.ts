import { NextResponse } from "next/server";
import { expireStuckAnalyses } from "@/lib/analyses/watchdog";
import { isValidInternalSecret } from "@/lib/internal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createAdminClient();
  const body = (await request.json().catch(() => ({}))) as {
    analysisId?: string;
  };

  const isInternal = isValidInternalSecret(request);

  if (!isInternal) {
    const userClient = await createClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const expired = await expireStuckAnalyses(supabase, {
      analysisId: body.analysisId,
      userId: user.id,
    });

    return NextResponse.json({ expired });
  }

  const expired = await expireStuckAnalyses(supabase, {
    analysisId: body.analysisId,
  });

  return NextResponse.json({ expired });
}
