import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calibrateScoresFromVisualEvidence,
  isRetentionCalibrationV2,
  retentionTargetV2,
} from "@/lib/ai/scoring";
import { isSwipeCheckEnabled } from "@/lib/ai/gemini-swipe-check";

describe("retentionTargetV2", () => {
  it("maps strong Gemini signals into the founder 'good' band (85+)", () => {
    expect(retentionTargetV2({ coldScrollStopScore: 8, watchThroughScore: 8 })).toBeGreaterThanOrEqual(85);
  });
  it("maps a 7/8 read to the mediocre band (75-84)", () => {
    const t = retentionTargetV2({ coldScrollStopScore: 7, watchThroughScore: 8 })!;
    expect(t).toBeGreaterThanOrEqual(75);
    expect(t).toBeLessThan(85);
  });
  it("swipe check caps failing hooks below 70", () => {
    expect(
      retentionTargetV2({ coldScrollStopScore: 7, watchThroughScore: 8, swipeCheck: { swipeBefore2s: true, estStillWatching2sPct: 15 } })
    ).toBeLessThan(70);
  });
  it("returns undefined without both Gemini scores", () => {
    expect(retentionTargetV2({ coldScrollStopScore: 7 })).toBeUndefined();
  });
});

describe("preview flag gates", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("turns RETENTION_CALIBRATION v2 on for Vercel preview without the env flag", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("RETENTION_CALIBRATION", "");
    expect(isRetentionCalibrationV2()).toBe(true);
  });

  it("keeps RETENTION_CALIBRATION v2 off in production unless the env flag is set", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("RETENTION_CALIBRATION", "");
    expect(isRetentionCalibrationV2()).toBe(false);

    vi.stubEnv("RETENTION_CALIBRATION", "v2");
    expect(isRetentionCalibrationV2()).toBe(true);
  });

  it("turns GEMINI_SWIPE_CHECK on for Vercel preview when Vertex is configured", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("GEMINI_SWIPE_CHECK", "");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "creativeiq-test");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", '{"type":"service_account"}');
    expect(isSwipeCheckEnabled()).toBe(true);
  });

  it("keeps GEMINI_SWIPE_CHECK off in production unless the env flag is set", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("GEMINI_SWIPE_CHECK", "");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "creativeiq-test");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", '{"type":"service_account"}');
    expect(isSwipeCheckEnabled()).toBe(false);

    vi.stubEnv("GEMINI_SWIPE_CHECK", "1");
    expect(isSwipeCheckEnabled()).toBe(true);
  });

  it("does not enable swipe check on preview when Vertex is not configured", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("GEMINI_SWIPE_CHECK", "1");
    vi.stubEnv("GOOGLE_CLOUD_PROJECT", "");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_JSON", "");
    expect(isSwipeCheckEnabled()).toBe(false);
  });

  it("applies the v2 retention target on preview instead of the v1 heuristics", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("RETENTION_CALIBRATION", "");
    const signals = { coldScrollStopScore: 8, watchThroughScore: 8 };
    const result = calibrateScoresFromVisualEvidence(
      { scrollStopScore: 38, watchThroughScore: 36, retentionScore: 72 },
      signals
    );
    expect(result.retentionScore).toBe(retentionTargetV2(signals));
    expect(result.retentionScore).toBeGreaterThanOrEqual(85);
  });
});
