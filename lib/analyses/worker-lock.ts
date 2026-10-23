import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkerLockResult =
  | "acquired"
  | "already_running"
  | "not_processing"
  | "missing";

/**
 * Single-flight lease: only one worker invocation may run an analysis.
 * A second trigger (run route + status heal) sees the lock and exits.
 */
export async function acquireAnalysisWorkerLock(
  supabase: SupabaseClient,
  analysisId: string
): Promise<WorkerLockResult> {
  const { data: current, error: readError } = await supabase
    .from("analyses")
    .select("id, status, worker_locked_at")
    .eq("id", analysisId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message);
  }
  if (!current) return "missing";
  if (current.status !== "processing") return "not_processing";
  if (current.worker_locked_at) return "already_running";

  const now = new Date().toISOString();
  const { data: locked, error: lockError } = await supabase
    .from("analyses")
    .update({ worker_locked_at: now, updated_at: now })
    .eq("id", analysisId)
    .eq("status", "processing")
    .is("worker_locked_at", null)
    .select("id")
    .maybeSingle();

  if (lockError) {
    throw new Error(lockError.message);
  }

  return locked ? "acquired" : "already_running";
}
