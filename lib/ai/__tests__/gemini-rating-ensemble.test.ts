import { describe, expect, it } from "vitest";
import {
  GEMINI_RATING_ENSEMBLE_N,
  aggregateGeminiRatingRuns,
  collectSuccessfulResults,
  formatGeminiSampleRatings,
  medianNumber,
  pickClosestRatingRun,
  settleSuccessful,
  shortHash,
} from "@/lib/ai/gemini-rating-ensemble";
import type { VideoAnalysisResult } from "@/lib/ai/video-analysis-types";

function run(
  overrides: Partial<VideoAnalysisResult> & {
    coldScrollStopScore?: number;
    watchThroughScore?: number;
  }
): VideoAnalysisResult {
  return {
    visualDescription: overrides.visualDescription ?? "visual",
    primaryMessaging: overrides.primaryMessaging ?? "sell",
    backgroundAudioNote: "",
    onScreenText: "",
    coldScrollStopEvidence: overrides.coldScrollStopEvidence ?? "cold-evidence",
    watchThroughEvidence: overrides.watchThroughEvidence ?? "watch-evidence",
    firstThreeSeconds: overrides.firstThreeSeconds ?? "open",
    ...overrides,
  };
}

describe("shortHash / formatGeminiSampleRatings", () => {
  it("keeps Job 1 at a single Gemini rating call", () => {
    expect(GEMINI_RATING_ENSEMBLE_N).toBe(1);
  });

  it("fingerprints identical Whisper text the same way across runs", () => {
    expect(shortHash("hello whisper")).toBe(shortHash("hello whisper"));
    expect(shortHash("hello whisper")).not.toBe(shortHash("hello whisper."));
    expect(shortHash("hello whisper")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("formats each of the 3 sample cold/watch ratings for worker logs", () => {
    expect(
      formatGeminiSampleRatings([
        { coldScrollStopScore: 5, watchThroughScore: 7 },
        { coldScrollStopScore: 5, watchThroughScore: 7 },
        { coldScrollStopScore: 7, watchThroughScore: 8 },
      ])
    ).toBe("1:5/7 2:5/7 3:7/8");
  });
});

describe("medianNumber", () => {
  it("returns the middle value for an odd count", () => {
    expect(medianNumber([5, 7, 5])).toBe(5);
    expect(medianNumber([7, 8, 5])).toBe(7);
  });

  it("rounds the mean of the two central values for an even count", () => {
    expect(medianNumber([5, 7])).toBe(6);
    expect(medianNumber([7, 8])).toBe(8);
  });

  it("returns undefined for an empty list", () => {
    expect(medianNumber([])).toBeUndefined();
  });
});

describe("aggregateGeminiRatingRuns", () => {
  it("returns the single successful run unchanged (failure fallback)", () => {
    const only = run({
      coldScrollStopScore: 7,
      watchThroughScore: 8,
      coldScrollStopEvidence: "only-cold",
      watchThroughEvidence: "only-watch",
    });
    expect(aggregateGeminiRatingRuns([only])).toEqual(only);
  });

  it("takes the median of noisy 5-vs-7 / 7-vs-8 ratings and keeps matching qualitative text", () => {
    // Production swing: cold 5 vs 7 and watch 7 vs 8 moved retention 62 vs 76.
    const a = run({
      coldScrollStopScore: 5,
      watchThroughScore: 7,
      coldScrollStopEvidence: "static open",
      watchThroughEvidence: "dead hold at 0:12",
      visualDescription: "run-a",
    });
    const b = run({
      coldScrollStopScore: 7,
      watchThroughScore: 8,
      coldScrollStopEvidence: "pattern interrupt",
      watchThroughEvidence: "tight pacing",
      visualDescription: "run-b",
    });
    const c = run({
      coldScrollStopScore: 5,
      watchThroughScore: 7,
      coldScrollStopEvidence: "static open, leftover take",
      watchThroughEvidence: "same dead hold",
      visualDescription: "run-c",
    });

    const result = aggregateGeminiRatingRuns([a, b, c]);
    expect(result.coldScrollStopScore).toBe(5);
    expect(result.watchThroughScore).toBe(7);
    expect(result.visualDescription).toBe("run-a");
    expect(result.coldScrollStopEvidence).toBe("static open");
  });

  it("picks the run whose ratings are closest to the median for qualitative text", () => {
    const far = run({
      coldScrollStopScore: 9,
      watchThroughScore: 9,
      visualDescription: "far",
      firstThreeSeconds: "far-open",
    });
    const near = run({
      coldScrollStopScore: 6,
      watchThroughScore: 7,
      visualDescription: "near",
      firstThreeSeconds: "near-open",
    });
    const other = run({
      coldScrollStopScore: 4,
      watchThroughScore: 8,
      visualDescription: "other",
    });

    const result = aggregateGeminiRatingRuns([far, near, other]);
    // median cold=[9,6,4]→6, watch=[9,7,8]→8. Distances: far=4, near=1, other=2.
    expect(result.coldScrollStopScore).toBe(6);
    expect(result.watchThroughScore).toBe(8);
    expect(result.visualDescription).toBe("near");
    expect(result.firstThreeSeconds).toBe("near-open");
  });

  it("uses whatever two runs succeeded and still applies the median", () => {
    const low = run({
      coldScrollStopScore: 5,
      watchThroughScore: 7,
      visualDescription: "low",
    });
    const high = run({
      coldScrollStopScore: 7,
      watchThroughScore: 8,
      visualDescription: "high",
    });
    const result = aggregateGeminiRatingRuns([low, high]);
    expect(result.coldScrollStopScore).toBe(6);
    expect(result.watchThroughScore).toBe(8);
    expect(result.visualDescription).toBe("high");
  });

  it("throws when given no runs", () => {
    expect(() => aggregateGeminiRatingRuns([])).toThrow(/no successful runs/);
  });
});

describe("pickClosestRatingRun", () => {
  it("breaks ties by keeping the first run", () => {
    const first = { id: "first", cold: 5, watch: 7 };
    const second = { id: "second", cold: 5, watch: 7 };
    const picked = pickClosestRatingRun(
      [first, second],
      (r) => ({ cold: r.cold, watch: r.watch }),
      5,
      7
    );
    expect(picked.id).toBe("first");
  });
});

describe("settleSuccessful / collectSuccessfulResults", () => {
  it("keeps whatever runs succeeded when some reject", async () => {
    const succeeded = await settleSuccessful([
      Promise.reject(new Error("vertex 429")),
      Promise.resolve(
        run({
          coldScrollStopScore: 6,
          watchThroughScore: 6,
          visualDescription: "kept",
        })
      ),
      Promise.reject(new Error("timeout")),
    ]);

    expect(succeeded).toHaveLength(1);
    expect(succeeded[0].visualDescription).toBe("kept");
    expect(aggregateGeminiRatingRuns(succeeded).visualDescription).toBe("kept");
  });

  it("throws the first error when every run fails", async () => {
    await expect(
      settleSuccessful([
        Promise.reject(new Error("first-fail")),
        Promise.reject(new Error("second-fail")),
      ])
    ).rejects.toThrow("first-fail");
  });

  it("collects fulfilled values in order and records the first rejection", () => {
    const settled: PromiseSettledResult<number>[] = [
      { status: "rejected", reason: new Error("a") },
      { status: "fulfilled", value: 2 },
      { status: "fulfilled", value: 3 },
    ];
    const { succeeded, firstError } = collectSuccessfulResults(settled);
    expect(succeeded).toEqual([2, 3]);
    expect(firstError).toBeInstanceOf(Error);
    expect((firstError as Error).message).toBe("a");
  });
});
