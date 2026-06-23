import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateAccountState, toAccountSnapshot } from "@/lib/billing/account";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await evaluateAccountState(user.id);
  return NextResponse.json(toAccountSnapshot(state));
}
