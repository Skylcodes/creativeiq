import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Analysis } from "@/lib/types/analysis";

export async function getReportPageData(analysisId: string, userId: string) {
  const supabase = await createClient();

  const { data: analysis, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", analysisId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !analysis) {
    notFound();
  }

  const typed = analysis as Analysis;

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", typed.workspace_id)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    analysis: typed,
    workspaceName: workspace?.name ?? "Workspace",
    workspaceId: typed.workspace_id,
  };
}

export async function requireReportUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");
  return user;
}
