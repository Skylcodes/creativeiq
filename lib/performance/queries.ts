import { createClient } from "@/lib/supabase/server";
import type { Analysis } from "@/lib/types/analysis";
import { buildWorkspacePerformance } from "./build-performance-data";
import type { WorkspacePerformance } from "./types";

export async function getWorkspacePerformance(
  workspaceId: string,
  workspaceName: string
): Promise<WorkspacePerformance> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .not("funnel_score", "is", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return buildWorkspacePerformance(
    workspaceName,
    (data ?? []) as Analysis[]
  );
}

export async function getPerformanceSnapshot(
  workspaceId: string,
  workspaceName: string
) {
  const performance = await getWorkspacePerformance(workspaceId, workspaceName);
  return performance.snapshot;
}
