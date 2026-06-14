import { redirect } from "next/navigation";
import { ActiveDashboard } from "@/components/dashboard/active-dashboard";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard";
import { getDashboardData } from "@/lib/analyses/queries";
import { getTestQueueCount } from "@/lib/hooks/queries";
import { getPerformanceSnapshot } from "@/lib/performance/queries";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { workspace } = await getActiveWorkspace(user.id);

  if (!workspace) {
    redirect("/onboarding");
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "there";

  let metrics;
  let recentAnalyses;
  let hasAnalyses;
  let snapshot;
  let testQueueCount;

  try {
    [{ metrics, recentAnalyses, hasAnalyses }, snapshot, testQueueCount] =
      await Promise.all([
        getDashboardData(workspace.id),
        getPerformanceSnapshot(workspace.id, workspace.name),
        getTestQueueCount(workspace.id),
      ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dashboard data.";

    return <DashboardError message={message} />;
  }

  if (!hasAnalyses) {
    return <EmptyDashboard workspace={workspace} displayName={displayName} />;
  }

  return (
    <ActiveDashboard
      workspace={workspace}
      displayName={displayName}
      metrics={metrics}
      recentAnalyses={recentAnalyses}
      performanceSnapshot={snapshot}
      testQueueCount={testQueueCount}
    />
  );
}
