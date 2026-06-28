function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Deterministic blend of strategic + retention into creativeStrengthScore.
 * Applied in application code — never ask the model to compute this.
 */
export function computeCreativeStrengthScore(
  strategicScore: number,
  retentionScore: number
): number {
  const strategic = clamp(strategicScore, 0, 100);
  const retention = clamp(retentionScore, 0, 100);
  const gap = strategic - retention;

  if (gap >= 30) {
    return retention >= 50
      ? clamp(Math.round(strategic * 0.35 + retention * 0.65), 0, 100)
      : clamp(
          Math.min(68, Math.round(strategic * 0.3 + retention * 0.7)),
          0,
          100
        );
  }
  if (gap >= 15) {
    return clamp(Math.round(strategic * 0.45 + retention * 0.55), 0, 100);
  }
  if (gap <= -15) {
    return strategic < 45
      ? clamp(Math.round(strategic * 0.6 + retention * 0.4), 0, 100)
      : clamp(Math.round(strategic * 0.5 + retention * 0.5), 0, 100);
  }
  return clamp(Math.round(strategic * 0.5 + retention * 0.5), 0, 100);
}

export type ResolvedCreativeScores = {
  strategicScore: number;
  retentionScore: number;
  creativeStrengthScore: number;
  retentionVerdict?: string;
};

/** Resolve scores from AI output — blend is always computed deterministically. */
export function resolveCreativeScores(raw: {
  strategicScore?: number;
  retentionScore?: number;
  creativeStrengthScore?: number;
  retentionVerdict?: string;
}): ResolvedCreativeScores {
  const legacy = clamp(raw.creativeStrengthScore ?? 0, 0, 100);
  const strategic = clamp(raw.strategicScore ?? legacy, 0, 100);
  const retention = clamp(raw.retentionScore ?? legacy, 0, 100);

  const creativeStrengthScore = computeCreativeStrengthScore(
    strategic,
    retention
  );

  return {
    strategicScore: strategic,
    retentionScore: retention,
    creativeStrengthScore,
    retentionVerdict: raw.retentionVerdict?.trim() || undefined,
  };
}
