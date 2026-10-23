/** Fail the job ourselves before Vercel hard-kills the function at maxDuration=300s. */
export const PIPELINE_DEADLINE_MS = 270_000;

/** Re-dispatch a worker that never locked after the run route returned. */
export const WORKER_RETRIGGER_AFTER_MS = 45_000;

/** How long the trigger invocation waits for the worker request to be accepted. */
export const WORKER_TRIGGER_FETCH_TIMEOUT_MS = 5_000;
