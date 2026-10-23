import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { expireStuckAnalyses } from "@/lib/analyses/watchdog";
import {
  decideAndHealProcessingAnalysis,
  type AnalysisWorkerSnapshot,
  type HealAction,
} from "@/lib/analyses/worker-reliability";
import { triggerBackgroundWorker } from "@/lib/trigger-worker";

export async function markAnalysisRetriggered(
  supabase: SupabaseClient,
  row: AnalysisWorkerSnapshot,
  nowIso: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("analyses")
    .update({ updated_at: nowIso })
    .eq("id", row.id)
    .eq("status", "processing")
    .eq("updated_at", row.updated_at)
    .is("worker_locked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}

export async function healProcessingAnalysis(options: {
  supabase: SupabaseClient;
  request: Request;
  row: AnalysisWorkerSnapshot;
  userId?: string;
  nowMs?: number;
}): Promise<HealAction> {
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();

  return decideAndHealProcessingAnalysis({
    row: options.row,
    nowMs,
    markRetriggered: () => markAnalysisRetriggered(options.supabase, options.row, nowIso),
    expire: async () => {
      await expireStuckAnalyses(options.supabase, {
        analysisId: options.row.id,
        userId: options.userId,
      });
    },
    trigger: () =>
      triggerBackgroundWorker(options.request, `/api/analyses/${options.row.id}/worker`),
  });
}
