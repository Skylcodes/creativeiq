import type { OpeningFeatures } from "@/lib/ai/video-analysis-types";

/**
 * Retention calibration v3 (flag: RETENTION_CALIBRATION=v3, or Vercel preview).
 *
 * Linear model fitted on 117 English DTC TikTok ads with real 2-second
 * retention (TikTok Creative Center). Predicts share of viewers still watching
 * at 2s from Gemini's own estimate plus three observable opening facts, then
 * maps that share onto the founder scale (85+ good, 75-84 mediocre,
 * 70-74 below average, <70 bad) with CV-tuned thresholds.
 */
export const RETENTION_V3_WEIGHTS = {
  bias: 0.1972,
  est2s: 0.3323,
  curiosityGap: 0.0593,
  polishedBrandLook: -0.1403,
  productOrLogoAt0s: -0.0604,
} as const;

// Thresholds on the predicted 2s retention, tuned with stratified 5-fold CV
// (x20) so great ads (>=60% at 2s) clear 75 at least as often as live while
// weak ads (<20%) rarely reach 75. Predictions are shrunk toward the mean,
// so these sit lower than the raw tier cut-offs.
const ANCHOR_RETENTION = [-0.2037, 0.3157, 0.3623, 0.4726, 0.7892];
const ANCHOR_SCORE = [50, 70, 75, 85, 95];

export function isRetentionV3Enabled(): boolean {
  return (
    process.env.RETENTION_CALIBRATION?.trim().toLowerCase() === "v3" ||
    process.env.VERCEL_ENV === "preview"
  );
}

export function formatWorkerGeminiLog(
  analysisId: string,
  signals: {
    coldScrollStopScore?: number;
    watchThroughScore?: number;
    openingFeatures?: OpeningFeatures;
  }
): string {
  const f = signals.openingFeatures;
  const pred = f ? predictTwoSecondRetention(f) : undefined;
  const feat = f
    ? `gap=${f.curiosityGap ? 1 : 0} brand=${f.polishedBrandLook ? 1 : 0} logo=${f.productOrLogoAt0s ? 1 : 0}`
    : "n/a";
  return `[worker] gemini ${analysisId} cold=${signals.coldScrollStopScore ?? "n/a"} watch=${signals.watchThroughScore ?? "n/a"} feat=${feat} est2s=${f?.est2sRetentionPct ?? "n/a"} pred2s=${pred != null ? pred.toFixed(3) : "n/a"} v3=${isRetentionV3Enabled() ? "on" : "off"}`;
}

function interp(x: number, xs: number[], ys: number[]): number {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return ys[i - 1] + t * (ys[i] - ys[i - 1]);
    }
  }
  return ys[ys.length - 1];
}

export function predictTwoSecondRetention(f: OpeningFeatures): number | undefined {
  const est = f.est2sRetentionPct;
  if (typeof est !== "number" || !Number.isFinite(est)) return undefined;
  const w = RETENTION_V3_WEIGHTS;
  return (
    w.bias +
    w.est2s * (Math.min(100, Math.max(0, est)) / 100) +
    w.curiosityGap * (f.curiosityGap ? 1 : 0) +
    w.polishedBrandLook * (f.polishedBrandLook ? 1 : 0) +
    w.productOrLogoAt0s * (f.productOrLogoAt0s ? 1 : 0)
  );
}

/** Returns a 0-100 retention score, or undefined when features are missing. */
export function computeRetentionV3(f?: OpeningFeatures | null): number | undefined {
  if (!f) return undefined;
  const p = predictTwoSecondRetention(f);
  if (p == null) return undefined;
  return Math.round(interp(p, ANCHOR_RETENTION, ANCHOR_SCORE));
}
