import type { AnalysisReport } from "@/lib/types/report";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** How much retention vs strategy weights the blended creative score. */
export function retentionWeightForKind(
  kind: AnalysisReport["flags"]["creativeKind"]
): number {
  switch (kind) {
    case "video":
      return 0.58;
    case "image":
      return 0.52;
    case "script":
      return 0.42;
    default:
      return 0.5;
  }
}

/**
 * Blends strategic + retention into creativeStrengthScore.
 * Low retention with strong messaging cannot produce a high blended score.
 */
export function blendCreativeStrength(
  strategicScore: number,
  retentionScore: number,
  kind: AnalysisReport["flags"]["creativeKind"]
): number {
  const wR = retentionWeightForKind(kind);
  const wS = 1 - wR;
  let blended = strategicScore * wS + retentionScore * wR;

  // Strong copy + boring execution — classic failure mode (video; still applies to weak static frames)
  if (retentionScore < 50 && strategicScore >= 70) {
    blended = Math.min(blended, strategicScore * 0.55 + retentionScore * 0.45);
  }

  // Video-only: critically low watchability caps the creative grade
  if (kind === "video" && retentionScore < 40) {
    blended = Math.min(blended, 62);
  }

  // Strong retention cannot fully rescue broken messaging
  if (strategicScore < 45 && retentionScore >= 75) {
    blended = Math.min(blended, strategicScore * 0.65 + retentionScore * 0.35);
  }

  return clamp(blended, 0, 100);
}

export type ResolvedCreativeScores = {
  strategicScore: number;
  retentionScore: number;
  creativeStrengthScore: number;
  retentionVerdict?: string;
};

/** Resolve scores from AI output with deterministic blending fallback. */
export function resolveCreativeScores(
  raw: {
    strategicScore?: number;
    retentionScore?: number;
    creativeStrengthScore?: number;
    retentionVerdict?: string;
  },
  kind: AnalysisReport["flags"]["creativeKind"]
): ResolvedCreativeScores {
  const legacy = clamp(raw.creativeStrengthScore ?? 0, 0, 100);
  const strategic = clamp(raw.strategicScore ?? legacy, 0, 100);
  const retention = clamp(raw.retentionScore ?? legacy, 0, 100);

  const hasSplit =
    raw.strategicScore != null &&
    raw.retentionScore != null &&
    Math.abs(strategic - retention) >= 3;

  const creativeStrengthScore = hasSplit
    ? blendCreativeStrength(strategic, retention, kind)
    : legacy || blendCreativeStrength(strategic, retention, kind);

  return {
    strategicScore: strategic,
    retentionScore: retention,
    creativeStrengthScore,
    retentionVerdict: raw.retentionVerdict?.trim() || undefined,
  };
}
