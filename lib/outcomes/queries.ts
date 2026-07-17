import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CreativeLaunch,
  LaunchOutcome,
  LaunchWithOutcomes,
} from "@/lib/types/outcome";

function attachOutcomes(
  launches: CreativeLaunch[],
  outcomes: LaunchOutcome[]
): LaunchWithOutcomes[] {
  const byLaunch = new Map<string, LaunchOutcome[]>();
  for (const outcome of outcomes) {
    const list = byLaunch.get(outcome.launch_id) ?? [];
    list.push(outcome);
    byLaunch.set(outcome.launch_id, list);
  }
  return launches.map((launch) => ({
    ...launch,
    outcomes: byLaunch.get(launch.id) ?? [],
  }));
}

export async function getLaunchesForAnalysis(
  analysisId: string
): Promise<LaunchWithOutcomes[]> {
  const supabase = await createClient();

  const { data: launches, error } = await supabase
    .from("creative_launches")
    .select("*")
    .eq("analysis_id", analysisId)
    .order("launched_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!launches || launches.length === 0) return [];

  const { data: outcomes, error: outcomesError } = await supabase
    .from("launch_outcomes")
    .select("*")
    .in(
      "launch_id",
      launches.map((l) => l.id)
    )
    .order("window_end", { ascending: true });

  if (outcomesError) throw new Error(outcomesError.message);

  return attachOutcomes(
    launches as CreativeLaunch[],
    (outcomes ?? []) as LaunchOutcome[]
  );
}

export async function getWorkspaceLaunches(
  workspaceId: string
): Promise<LaunchWithOutcomes[]> {
  const supabase = await createClient();

  const { data: launches, error } = await supabase
    .from("creative_launches")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("launched_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  if (!launches || launches.length === 0) return [];

  const { data: outcomes, error: outcomesError } = await supabase
    .from("launch_outcomes")
    .select("*")
    .in(
      "launch_id",
      launches.map((l) => l.id)
    )
    .order("window_end", { ascending: true });

  if (outcomesError) throw new Error(outcomesError.message);

  return attachOutcomes(
    launches as CreativeLaunch[],
    (outcomes ?? []) as LaunchOutcome[]
  );
}
