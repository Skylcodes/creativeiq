import { describe, expect, it } from "vitest";
import {
  formatGeminiVisualContextForGrading,
  geminiAnalysisNeedsRetry,
  normalizeAnalysis,
  dropOffStartSec,
  buildRetentionScoringContract,
  GEMINI_VIDEO_SEED,
  GEMINI_VIDEO_TEMPERATURE,
  GEMINI_VIDEO_ATTEMPT_TIMEOUT_MS,
  GEMINI_VIDEO_TOTAL_BUDGET_MS,
  GEMINI_VIDEO_MAX_OUTPUT_TOKENS,
  GEMINI_VIDEO_THINKING_BUDGET,
  shouldRetryGemini,
  applyDefectCaps,
} from "@/lib/ai/gemini-vertex-video";
import { VIDEO_ANALYSIS_JSON_SCHEMA, type VideoAnalysisResult } from "@/lib/ai/video-analysis-types";

function baseAnalysis(overrides: Partial<VideoAnalysisResult>): VideoAnalysisResult {
  return {
    visualDescription: "test",
    primaryMessaging: "test",
    backgroundAudioNote: "",
    onScreenText: "",
    coldScrollStopScore: 5,
    watchThroughScore: 5,
    ...overrides,
  };
}

describe("normalizeAnalysis", () => {
  it("leaves scores untouched when there are no drop-off moments", () => {
    const result = normalizeAnalysis(
      baseAnalysis({ coldScrollStopScore: 7, watchThroughScore: 8, dropOffMoments: [] })
    );
    expect(result.coldScrollStopScore).toBe(7);
    expect(result.watchThroughScore).toBe(8);
  });

  it("caps watchThroughScore to 6 when 2+ generic drop-offs are listed", () => {
    const result = normalizeAnalysis(
      baseAnalysis({
        coldScrollStopScore: 8,
        watchThroughScore: 8,
        dropOffMoments: ["~0:10 pacing drags", "~0:20 repetitive beat"],
      })
    );
    expect(result.watchThroughScore).toBeLessThanOrEqual(6);
    // Mid-video drop-offs say nothing about the hook — opening score is kept.
    expect(result.coldScrollStopScore).toBe(8);
  });

  it("caps the opening score only when a drop-off is inside the first 3s", () => {
    const result = normalizeAnalysis(
      baseAnalysis({
        coldScrollStopScore: 8,
        watchThroughScore: 8,
        dropOffMoments: ["~0:02 logo card, no reason to stay", "~0:20 repetitive beat"],
      })
    );
    expect(result.coldScrollStopScore).toBeLessThanOrEqual(5);
  });

  it("parses drop-off start times", () => {
    expect(dropOffStartSec("~0:32–0:37 static hold")).toBe(32);
    expect(dropOffStartSec("~1:05 repeat")).toBe(65);
    expect(dropOffStartSec("2.5s blank frame")).toBe(2.5);
    expect(dropOffStartSec("middle drags")).toBe(Number.POSITIVE_INFINITY);
  });

  it("caps watchThroughScore to 5 when a drop-off cites reading burden — reproduces the real bad-ad case", () => {
    // This mirrors an actual production case: Gemini reported cold=8/watch=7 for a
    // text-heavy screen-recording ad, and listed two drop-offs describing dense
    // on-screen text a viewer must stop and read — but still scored watchThrough at
    // 7, violating its own stated rule. This must be enforced deterministically
    // rather than trusting the model to self-apply it.
    const result = normalizeAnalysis(
      baseAnalysis({
        coldScrollStopScore: 8,
        watchThroughScore: 7,
        dropOffMoments: [
          "0:36-0:44: the report section contains a significant amount of text that requires active reading",
          "0:44-0:45: the comparison segment presents a large block of text that needs to be read",
        ],
      })
    );
    expect(result.watchThroughScore).toBeLessThanOrEqual(5);
  });

  it("does not penalize a single non-reading drop-off beyond the generic cap", () => {
    const result = normalizeAnalysis(
      baseAnalysis({
        coldScrollStopScore: 7,
        watchThroughScore: 8,
        dropOffMoments: ["~0:15 a brief static hold before the payoff"],
      })
    );
    expect(result.watchThroughScore).toBeLessThanOrEqual(7);
    expect(result.watchThroughScore).toBeGreaterThanOrEqual(5);
  });
});

describe("geminiAnalysisNeedsRetry", () => {
  it("retries when Gemini omitted cold or watch scores", () => {
    expect(
      geminiAnalysisNeedsRetry(baseAnalysis({ coldScrollStopScore: undefined, watchThroughScore: 8 }))
    ).toBe(true);
    expect(
      geminiAnalysisNeedsRetry(baseAnalysis({ coldScrollStopScore: 7, watchThroughScore: undefined }))
    ).toBe(true);
  });

  it("does not retry a complete cold/watch payload", () => {
    expect(geminiAnalysisNeedsRetry(baseAnalysis({ coldScrollStopScore: 7, watchThroughScore: 8 }))).toBe(
      false
    );
  });
});

describe("Gemini score placement", () => {
  it("puts cold/watch before the visual description in the JSON schema", () => {
    const coldAt = VIDEO_ANALYSIS_JSON_SCHEMA.indexOf('"coldScrollStopScore"');
    const descAt = VIDEO_ANALYSIS_JSON_SCHEMA.indexOf('"visualDescription"');
    expect(coldAt).toBeGreaterThan(-1);
    expect(descAt).toBeGreaterThan(-1);
    expect(coldAt).toBeLessThan(descAt);
    expect(VIDEO_ANALYSIS_JSON_SCHEMA).not.toMatch(/openingFeatures/);
  });

  it("puts cold/watch before the visual description in the grading brief", () => {
    const text = formatGeminiVisualContextForGrading(
      baseAnalysis({
        visualDescription: "A talking-head product demo.",
        coldScrollStopScore: 7,
        watchThroughScore: 8,
        coldScrollStopEvidence: "face + claim in 0-1s",
        watchThroughEvidence: "cuts hold after the stop",
      })
    );
    expect(text.indexOf("COLD SCROLL-STOP")).toBeLessThan(text.indexOf("VISUAL DESCRIPTION"));
    expect(text.indexOf("WATCH-THROUGH QUALITY")).toBeLessThan(text.indexOf("VISUAL DESCRIPTION"));
    expect(text).not.toMatch(/openingFeatures|OPENING FEATURES/i);
  });
});

describe("Gemini determinism + leak guards", () => {
  it("uses deterministic decoding (temperature 0, fixed seed)", () => {
    expect(GEMINI_VIDEO_TEMPERATURE).toBe(0);
    expect(Number.isInteger(GEMINI_VIDEO_SEED)).toBe(true);
  });
  it("labels retention guidance as internal and forbids quoting it", () => {
    const text = buildRetentionScoringContract(baseAnalysis({ coldScrollStopScore: 7, watchThroughScore: 8 }));
    expect(text).not.toMatch(/SCORING CONTRACT/);
    expect(text).toMatch(/NEVER quote/);
  });
});

describe("Gemini time/token budget (sp-ad-1 timeout regression)", () => {
  it("bounds each attempt and the total so scoring still fits under the 270s abort", () => {
    expect(GEMINI_VIDEO_ATTEMPT_TIMEOUT_MS).toBeLessThanOrEqual(75_000);
    expect(GEMINI_VIDEO_TOTAL_BUDGET_MS).toBeLessThanOrEqual(90_000);
  });
  it("skips the retry when the first attempt was slow", () => {
    expect(shouldRetryGemini(20_000)).toBe(true);
    expect(shouldRetryGemini(60_000)).toBe(false);
  });
  it("leaves output headroom after bounded thinking", () => {
    expect(GEMINI_VIDEO_MAX_OUTPUT_TOKENS - GEMINI_VIDEO_THINKING_BUDGET).toBeGreaterThanOrEqual(12_000);
  });
});

describe("defect audit caps (sp-ad-1 / bm_7365 must score low)", () => {
  it("sp-ad-1: slow 48s screen recording with a must-read report cannot keep 7/8", () => {
    const r = normalizeAnalysis(
      baseAnalysis({
        coldScrollStopScore: 7,
        watchThroughScore: 8,
        soundOffComprehensionScore: 3,
        defects: [
          { type: "reading_burden", severity: "critical", timestamp: "~0:36", evidence: "slow scroll through dense report" },
          { type: "length", severity: "major", evidence: "48s for one idea" },
          { type: "pacing", severity: "major", evidence: "long holds on static UI" },
          { type: "comprehension", severity: "major", evidence: "unclear what is sold sound-off" },
        ],
      })
    );
    expect(r.coldScrollStopScore).toBeLessThanOrEqual(4);
    expect(r.watchThroughScore).toBeLessThanOrEqual(4);
  });

  it("bm_7365: generic beauty-shot hook is capped", () => {
    const r = applyDefectCaps({ cold: 7, watch: 8 }, [
      { type: "hook", severity: "major", evidence: "generic caption, no face, no tension" },
    ]);
    expect(r.cold).toBeLessThanOrEqual(5);
  });

  it("minor defects do not move a clean ad", () => {
    expect(
      applyDefectCaps({ cold: 8, watch: 8 }, [{ type: "pacing", severity: "minor", evidence: "x" }], 8)
    ).toEqual({ cold: 8, watch: 8 });
  });
});
