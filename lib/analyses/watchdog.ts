import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ANALYSIS_TIMEOUT_MESSAGE,
  ANALYSIS_TIMEOUT_MS,
} from "@/lib/analyses/watchdog-constants";

export { ANALYSIS_TIMEOUT_MS, ANALYSIS_TIMEOUT_MESSAGE } from "@/lib/analyses/watchdog-constants";
export { isTimeoutError } from "@/lib/analyses/watchdog-constants";

/**
 * Marks analyses stuck in "processing" for longer than the timeout as failed.
 * Returns the number of rows updated.
 */
export async function expireStuckAnalyses(
  supabase: SupabaseClient,
  options?: { analysisId?: string; userId?: string }
): Promise<number> {
  const cutoff = new Date(Date.now() - ANALYSIS_TIMEOUT_MS).toISOString();

  let query = supabase
    .from("analyses")
    .update({
      status: "failed",
      error_message: ANALYSIS_TIMEOUT_MESSAGE,
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("updated_at", cutoff)
    .select("id");

  if (options?.analysisId) {
    query = query.eq("id", options.analysisId);
  }
  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}
