import { redirect } from "next/navigation";
import { PerformanceView } from "@/components/performance/performance-view";
import { DashboardError } from "@/components/dashboard/dashboard-error";
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

  return (
    <PerformanceView key={workspace.id} workspaceId={workspace.id} data={data} />
  );
}
