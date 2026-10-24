import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeRetentionV3,
  isRetentionV3Enabled,
  predictTwoSecondRetention,
} from "@/lib/ai/retention-v3";
import { calibrateScoresFromVisualEvidence } from "@/lib/ai/scoring";

const strong = { est2sRetentionPct: 70, curiosityGap: true, polishedBrandLook: false, productOrLogoAt0s: false };
const weak = { est2sRetentionPct: 15, curiosityGap: false, polishedBrandLook: true, productOrLogoAt0s: true };

describe("retention v3", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined without Gemini's estimate", () => {
    expect(computeRetentionV3(undefined)).toBeUndefined();
    expect(computeRetentionV3({ curiosityGap: true })).toBeUndefined();
  });

  it("orders strong openings above weak ones and stays in range", () => {
    const s = computeRetentionV3(strong)!; const w = computeRetentionV3(weak)!;
    expect(s).toBeGreaterThan(w);
    expect(w).toBeGreaterThanOrEqual(50); expect(s).toBeLessThanOrEqual(95);
    expect(w).toBeLessThan(70);
    expect(predictTwoSecondRetention(strong)!).toBeGreaterThan(predictTwoSecondRetention(weak)!);
  });

  it("only overrides retention when the flag is on", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("RETENTION_CALIBRATION", "");
    const scores = { scrollStopScore: 30, watchThroughScore: 30, retentionScore: 33 };
    const signals = { coldScrollStopScore: 7, watchThroughScore: 7, openingFeatures: weak };
    expect(calibrateScoresFromVisualEvidence(scores, signals).retentionScore).not.toBe(computeRetentionV3(weak));
    vi.stubEnv("RETENTION_CALIBRATION", "v3");
    expect(calibrateScoresFromVisualEvidence(scores, signals).retentionScore).toBe(computeRetentionV3(weak));
  });

  it("turns RETENTION_CALIBRATION v3 on for Vercel preview without the env flag", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("RETENTION_CALIBRATION", "");
    expect(isRetentionV3Enabled()).toBe(true);
  });

  it("keeps RETENTION_CALIBRATION v3 off in production unless the env flag is set", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("RETENTION_CALIBRATION", "");
    expect(isRetentionV3Enabled()).toBe(false);

    vi.stubEnv("RETENTION_CALIBRATION", "v3");
    expect(isRetentionV3Enabled()).toBe(true);
  });

  it("applies the v3 retention score on preview instead of the v1 heuristics", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("RETENTION_CALIBRATION", "");
    const scores = { scrollStopScore: 30, watchThroughScore: 30, retentionScore: 33 };
    const signals = { coldScrollStopScore: 7, watchThroughScore: 7, openingFeatures: weak };
    expect(calibrateScoresFromVisualEvidence(scores, signals).retentionScore).toBe(computeRetentionV3(weak));
  });
});
