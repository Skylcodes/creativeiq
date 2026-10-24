import { afterEach, describe, expect, it } from "vitest";
import { computeRetentionV3, predictTwoSecondRetention } from "@/lib/ai/retention-v3";
import { calibrateScoresFromVisualEvidence } from "@/lib/ai/scoring";

const strong = { est2sRetentionPct: 70, curiosityGap: true, polishedBrandLook: false, productOrLogoAt0s: false };
const weak = { est2sRetentionPct: 15, curiosityGap: false, polishedBrandLook: true, productOrLogoAt0s: true };

describe("retention v3", () => {
  afterEach(() => { delete process.env.RETENTION_CALIBRATION; });
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
    const scores = { scrollStopScore: 30, watchThroughScore: 30, retentionScore: 33 };
    const signals = { coldScrollStopScore: 7, watchThroughScore: 7, openingFeatures: weak };
    expect(calibrateScoresFromVisualEvidence(scores, signals).retentionScore).not.toBe(computeRetentionV3(weak));
    process.env.RETENTION_CALIBRATION = "v3";
    expect(calibrateScoresFromVisualEvidence(scores, signals).retentionScore).toBe(computeRetentionV3(weak));
  });
});
