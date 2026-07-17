import { redirect } from "next/navigation";
import { PerformanceView } from "@/components/performance/performance-view";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { getWorkspaceLaunches } from "@/lib/outcomes/queries";
import { getWorkspacePerformance } from "@/lib/performance/queries";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { workspace } = await getActiveWorkspace(user.id);
  if (!workspace) redirect("/onboarding");

  let data;

  try {
    data = await getWorkspacePerformance(workspace.id, workspace.name);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load performance data.";
    return <DashboardError message={message} />;
  }

  // Degrade to empty launches if outcome tables are missing or the query fails,
  // so predicted-score Performance still loads.
  let launches: Awaited<ReturnType<typeof getWorkspaceLaunches>> = [];
  let analysisMeta: Record<string, { title: string; creativeGoal?: string }> =
    {};
  try {
    launches = await getWorkspaceLaunches(workspace.id);
    if (launches.length > 0) {
      const ids = [...new Set(launches.map((l) => l.analysis_id))];
      const { data: analysisRows } = await supabase
        .from("analyses")
        .select("id, title, creative_goal")
        .in("id", ids);
      analysisMeta = Object.fromEntries(
        (analysisRows ?? []).map((a) => [
          a.id,
          {
            title: a.title as string,
            creativeGoal: a.creative_goal as string | undefined,
          },
        ])
      );
    }
  } catch (error) {
    console.error("[performance] Failed to load launch outcomes:", error);
  }

  return (
    <PerformanceView
      key={workspace.id}
      workspaceId={workspace.id}
      data={data}
      launches={launches}
      analysisMeta={analysisMeta}
    />
  );
}
