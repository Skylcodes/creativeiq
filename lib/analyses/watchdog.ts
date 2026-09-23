import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ANALYSIS_TIMEOUT_MESSAGE,
  ANALYSIS_TIMEOUT_MS,
} from "@/lib/analyses/watchdog-constants";
import {
  purgeAnalysisCreativesAfterTerminalStatus,
} from "@/lib/analyses/creative-storage";
import type { Analysis } from "@/lib/types/analysis";

export { ANALYSIS_TIMEOUT_MS, ANALYSIS_TIMEOUT_MESSAGE } from "@/lib/analyses/watchdog-constants";
export { isTimeoutError } from "@/lib/analyses/watchdog-constants";

/**
 * Marks analyses stuck in "processing" for longer than the timeout as failed,
 * then deletes their uploaded creatives (same as worker failure path).
 * Returns the number of rows updated.
 */
export async function expireStuckAnalyses(
  supabase: SupabaseClient,
  options?: { analysisId?: string; userId?: string }
): Promise<number> {
  const cutoff = new Date(Date.now() - ANALYSIS_TIMEOUT_MS).toISOString();

  let query = supabase
    .from("analyses")
    .select("id, creative_storage_path, thumbnail_url, variants, creative_type")
    .eq("status", "processing")
    .lt("updated_at", cutoff);

  if (options?.analysisId) {
    query = query.eq("id", options.analysisId);
  }
  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data: stuck, error: selectError } = await query;

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (!stuck?.length) return 0;

  const ids = stuck.map((row) => row.id);

  const { error: updateError } = await supabase
    .from("analyses")
    .update({
      status: "failed",
      error_message: ANALYSIS_TIMEOUT_MESSAGE,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (updateError) {
    throw new Error(updateError.message);
  }

  for (const row of stuck) {
    try {
      await purgeAnalysisCreativesAfterTerminalStatus(
        supabase,
        row as Pick<
          Analysis,
          "id" | "creative_storage_path" | "thumbnail_url" | "variants" | "creative_type"
        >
      );
    } catch (err) {
      console.error(
        "[watchdog] creative cleanup failed for",
        row.id,
        err instanceof Error ? err.message : err
      );
    }
  }

  return ids.length;
}
