import { ANALYSIS_TIMEOUT_MESSAGE } from "@/lib/analyses/watchdog-constants";

export class PipelineDeadlineError extends Error {
  override name = "PipelineDeadlineError";
  constructor(message = ANALYSIS_TIMEOUT_MESSAGE) {
    super(message);
  }
}

export function withDeadline<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      t = setTimeout(() => reject(new PipelineDeadlineError()), ms);
    }),
  ]).finally(() => t && clearTimeout(t));
}
