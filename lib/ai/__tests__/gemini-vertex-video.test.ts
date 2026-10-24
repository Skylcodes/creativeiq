import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildRetentionScoringContract,
  formatGeminiVisualContextForGrading,
  geminiAnalysisNeedsRetry,
  normalizeAnalysis,
} from "@/lib/ai/gemini-vertex-video";
import type { VideoAnalysisResult } from "@/lib/ai/video-analysis-types";

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
    expect(result.coldScrollStopScore).toBeLessThanOrEqual(5);
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

  it("preserves openingFeatures so v3 scoring can run", () => {
    const openingFeatures = {
      est2sRetentionPct: 40,
      curiosityGap: true,
      polishedBrandLook: false,
      productOrLogoAt0s: false,
    };
    const result = normalizeAnalysis(baseAnalysis({ openingFeatures }));
    expect(result.openingFeatures).toEqual(openingFeatures);
  });
});

describe("geminiAnalysisNeedsRetry", () => {
  it("retries when v3 is on but Gemini omitted est2sRetentionPct", () => {
    expect(
      geminiAnalysisNeedsRetry(
        baseAnalysis({
          coldScrollStopScore: 7,
          watchThroughScore: 8,
          openingFeatures: { curiosityGap: true },
        }),
        true
      )
    ).toBe(true);
  });

  it("does not retry a complete v3 payload", () => {
    expect(
      geminiAnalysisNeedsRetry(
        baseAnalysis({
          coldScrollStopScore: 7,
          watchThroughScore: 8,
          openingFeatures: { est2sRetentionPct: 40 },
        }),
        true
      )
    ).toBe(false);
  });
});

describe("buildRetentionScoringContract", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("tells Sonnet the fitted v3 score instead of the v1 ~76 map", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const contract = buildRetentionScoringContract(
      baseAnalysis({
        coldScrollStopScore: 7,
        watchThroughScore: 8,
        openingFeatures: {
          est2sRetentionPct: 70,
          curiosityGap: true,
          polishedBrandLook: false,
          productOrLogoAt0s: false,
        },
      })
    );
    expect(contract).not.toMatch(/center near ~/);
    expect(contract).toMatch(/MUST be \d+/);
    expect(contract).toMatch(/openingFeatures/);
  });
});

describe("formatGeminiVisualContextForGrading", () => {
  it("includes openingFeatures so Job 4 sees the v3 inputs", () => {
    const text = formatGeminiVisualContextForGrading(
      baseAnalysis({
        openingFeatures: {
          est2sRetentionPct: 40,
          curiosityGap: true,
          polishedBrandLook: false,
          productOrLogoAt0s: true,
        },
      })
    );
    expect(text).toMatch(/OPENING FEATURES/);
    expect(text).toMatch(/est2sRetentionPct=40/);
    expect(text).toMatch(/curiosityGap=true/);
  });
});
