import {
  WORKER_RETRIGGER_AFTER_MS,
} from "@/lib/analyses/worker-constants";
import { ANALYSIS_TIMEOUT_MS } from "@/lib/analyses/watchdog-constants";

export type HealDecision = "expire" | "retrigger" | "wait";

export type HealableAnalysis = {
  status: string;
  worker_locked_at?: string | null;
  worker_retriggered_at?: string | null;
  processing_started_at?: string | null;
  updated_at?: string | null;
};

/**
 * processing + no lock after ~45s → the trigger fetch was dropped; retry once.
 * Only expire after the real watchdog timeout — never fail a live worker early.
 */
export function decideProcessingHeal(
  row: HealableAnalysis,
  now = Date.now()
): HealDecision {
  if (row.status !== "processing") return "wait";

  const startedMs = Date.parse(row.processing_started_at ?? row.updated_at ?? "");
  const ageMs = Number.isFinite(startedMs) ? now - startedMs : 0;

  if (ageMs >= ANALYSIS_TIMEOUT_MS) return "expire";

  if (
    !row.worker_locked_at &&
    !row.worker_retriggered_at &&
    ageMs >= WORKER_RETRIGGER_AFTER_MS
  ) {
    return "retrigger";
  }

  return "wait";
}
