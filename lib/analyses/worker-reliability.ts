import { ANALYSIS_TIMEOUT_MESSAGE, ANALYSIS_TIMEOUT_MS } from "@/lib/analyses/watchdog-constants";

/** Fail the pipeline ourselves before Vercel hard-kills the function at 300s. */
export const PIPELINE_DEADLINE_MS = 270_000;

/** Re-trigger once if the worker never wrote a lock after the run route returned. */
export const WORKER_RETRIGGER_AFTER_MS = 45_000;

/** A later write (heal bump or worker lock) is at least this far after start. */
const RETRIGGER_WRITE_SLOP_MS = 1_000;

export const WORKER_TIMEOUT_MESSAGE = ANALYSIS_TIMEOUT_MESSAGE;

export type AnalysisWorkerSnapshot = {
  id: string;
  status: string;
  error_message?: string | null;
  processing_started_at: string | null;
  updated_at: string;
  worker_locked_at: string | null;
};

export function startedAtMs(row: Pick<AnalysisWorkerSnapshot, "processing_started_at" | "updated_at">): number {
  const raw = row.processing_started_at ?? row.updated_at;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

export function shouldExpireAnalysis(
  row: Pick<AnalysisWorkerSnapshot, "status" | "processing_started_at" | "updated_at">,
  nowMs: number
): boolean {
  if (row.status !== "processing") return false;
  const started = startedAtMs(row);
  if (!started) return false;
  return nowMs - started >= ANALYSIS_TIMEOUT_MS;
}

/**
 * Re-trigger only when the worker never started (no lock) and we have not
 * already bumped `updated_at` after `processing_started_at`.
 */
export function shouldRetriggerWorker(
  row: AnalysisWorkerSnapshot,
  nowMs: number
): boolean {
  if (row.status !== "processing") return false;
  if (row.worker_locked_at) return false;
  const started = startedAtMs(row);
  if (!started) return false;
  if (nowMs - started < WORKER_RETRIGGER_AFTER_MS) return false;

  const updatedMs = Date.parse(row.updated_at);
  const baseline = row.processing_started_at ? Date.parse(row.processing_started_at) : started;
  if (Number.isFinite(updatedMs) && updatedMs - baseline > RETRIGGER_WRITE_SLOP_MS) {
    return false;
  }
  return true;
}

export async function withDeadline<T>(
  promise: Promise<T>,
  ms: number = PIPELINE_DEADLINE_MS,
  message: string = WORKER_TIMEOUT_MESSAGE
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const guarded = promise.catch((err) => {
    if (timedOut) return undefined as T;
    throw err;
  });
  return Promise.race([
    guarded,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(new Error(message));
      }, ms);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export async function logWorkerStage<T>(
  stage: string,
  analysisId: string,
  work: () => Promise<T>
): Promise<T> {
  const t0 = Date.now();
  console.log(`[worker] stage ${stage} start ${analysisId}`);
  try {
    const result = await work();
    console.log(`[worker] stage ${stage} ${Date.now() - t0}ms ${analysisId}`);
    return result;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.log(
      `[worker] stage ${stage} ${Date.now() - t0}ms error ${analysisId} ${detail}`
    );
    throw err;
  }
}

export type HealAction = "none" | "retrigger" | "expire";

export async function decideAndHealProcessingAnalysis(options: {
  row: AnalysisWorkerSnapshot;
  nowMs: number;
  markRetriggered: () => Promise<boolean>;
  expire: () => Promise<void>;
  trigger: () => void;
}): Promise<HealAction> {
  const { row, nowMs, markRetriggered, expire, trigger } = options;

  if (shouldExpireAnalysis(row, nowMs)) {
    await expire();
    return "expire";
  }

  if (shouldRetriggerWorker(row, nowMs)) {
    const marked = await markRetriggered();
    if (marked) {
      trigger();
      return "retrigger";
    }
  }

  return "none";
}
