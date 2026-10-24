import type { VideoAnalysisResult } from "@/lib/ai/video-analysis-types";

/** Parallel Gemini rating runs. Wall time stays ~max(run), not sum. */
export const GEMINI_RATING_ENSEMBLE_N = 3;

/**
 * Median of numeric ratings. Odd count → middle value. Even count → rounded
 * mean of the two central values so we stay on the integer 0–10 scale.
 */
export function medianNumber(values: number[]): number | undefined {
  const finite = values.filter((n) => Number.isFinite(n));
  if (finite.length === 0) return undefined;
  const sorted = [...finite].sort((a, b) => a - b);
  const mid = Math.floor((sorted.length - 1) / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid] + sorted[mid + 1]) / 2);
}

export function collectSuccessfulResults<T>(
  settled: PromiseSettledResult<T>[]
): { succeeded: T[]; firstError: unknown } {
  const succeeded: T[] = [];
  let firstError: unknown;
  for (const result of settled) {
    if (result.status === "fulfilled") {
      succeeded.push(result.value);
    } else if (firstError === undefined) {
      firstError = result.reason;
    }
  }
  return { succeeded, firstError };
}

export async function settleSuccessful<T>(tasks: Array<Promise<T>>): Promise<T[]> {
  const { succeeded, firstError } = collectSuccessfulResults(
    await Promise.allSettled(tasks)
  );
  if (succeeded.length === 0) {
    throw firstError instanceof Error
      ? firstError
      : new Error("All parallel runs failed.");
  }
  return succeeded;
}

export function pickClosestRatingRun<T>(
  runs: T[],
  getRatings: (run: T) => { cold?: number; watch?: number },
  medianCold: number | undefined,
  medianWatch: number | undefined
): T {
  if (runs.length === 0) {
    throw new Error("Cannot pick a rating run from an empty list.");
  }

  let best = runs[0];
  let bestDist = Number.POSITIVE_INFINITY;

  for (const run of runs) {
    const { cold, watch } = getRatings(run);
    let dist = 0;
    if (medianCold != null) {
      dist += cold == null ? 100 : Math.abs(cold - medianCold);
    }
    if (medianWatch != null) {
      dist += watch == null ? 100 : Math.abs(watch - medianWatch);
    }
    if (dist < bestDist) {
      bestDist = dist;
      best = run;
    }
  }

  return best;
}

/**
 * Median the 0–10 cold/watch ratings; keep qualitative text from the run
 * whose ratings are closest to that median. Single successful run is returned
 * unchanged (failure fallback).
 */
export function aggregateGeminiRatingRuns(
  runs: VideoAnalysisResult[]
): VideoAnalysisResult {
  if (runs.length === 0) {
    throw new Error("Gemini rating ensemble received no successful runs.");
  }
  if (runs.length === 1) return runs[0];

  const colds = runs
    .map((r) => r.coldScrollStopScore)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const watches = runs
    .map((r) => r.watchThroughScore)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));

  const medianCold = medianNumber(colds);
  const medianWatch = medianNumber(watches);

  const picked = pickClosestRatingRun(
    runs,
    (r) => ({ cold: r.coldScrollStopScore, watch: r.watchThroughScore }),
    medianCold,
    medianWatch
  );

  return {
    ...picked,
    coldScrollStopScore: medianCold ?? picked.coldScrollStopScore,
    watchThroughScore: medianWatch ?? picked.watchThroughScore,
  };
}
