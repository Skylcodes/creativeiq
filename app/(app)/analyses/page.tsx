import { redirect } from "next/navigation";
import { AnalysesHistory } from "@/components/analyses/analyses-history";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { parseAnalysesHistoryParams } from "@/lib/analyses/history";
import {
  getAnalysesHistoryMetrics,
  getAnalysesHistoryPage,
} from "@/lib/analyses/queries";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/workspaces/queries";

export const dynamic = "force-dynamic";

type AnalysesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AnalysesPage({ searchParams }: AnalysesPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { workspace } = await getActiveWorkspace(user.id);
  if (!workspace) redirect("/onboarding");

  const resolvedParams = await searchParams;
  const params = parseAnalysesHistoryParams(resolvedParams);

  let analyses;
  let totalCount;
  let metrics;

  try {
    [{ analyses, totalCount }, metrics] = await Promise.all([
      getAnalysesHistoryPage(workspace.id, params),
      getAnalysesHistoryMetrics(workspace.id),
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load analyses.";
    return <DashboardError message={message} />;
  }

  return (
    <AnalysesHistory
      key={workspace.id}
      workspaceId={workspace.id}
      analyses={analyses}
      totalCount={totalCount}
      metrics={metrics}
      params={params}
    />
  );
}
