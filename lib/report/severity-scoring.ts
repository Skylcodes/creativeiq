import type { RawCriteria } from "@/lib/ai/criteria";
import type { CriteriaSeverityTier } from "@/lib/types/report";

export type RawCriteriaCheckItem = {
  id: string;
  pass: boolean | null;
  note?: string;
  /** Internal only — stripped before UI */
  severity?: CriteriaSeverityTier;
};

/**
 * Per-tier deduction weights for confirmed creative-criteria failures.
 * These are the SOLE source of criteria-based score adjustment — the AI
 * is instructed NOT to bake checklist results into its base scores.
 * Weights are calibrated assuming no prior AI-side penalty for these items.
 */
const CREATIVE_SEVERITY_WEIGHT: Record<CriteriaSeverityTier, number> = {
  critical: 13,
  moderate: 4.5,
  minor: 1,
};

const LP_SEVERITY_WEIGHT: Record<CriteriaSeverityTier, number> = {
  critical: 7,
  moderate: 3,
  minor: 0.75,
};

const MAX_CREATIVE_PENALTY = 35;
const MAX_LP_PENALTY = 20;

function inferSeverityFromNote(note?: string): CriteriaSeverityTier | undefined {
  if (!note) return undefined;
  const lower = note.toLowerCase();
  if (
    /\b(stop|block|fatal|unbelievable|contradict|missing cta|no hook|unclear what|scam|distrust)\b/.test(
      lower
    )
  ) {
    return "critical";
  }
  if (/\b(nice.to.have|tolerated|common in category|minor|polish)\b/.test(lower)) {
    return "minor";
  }
  return undefined;
}

export function normalizeCriteriaSeverities(
  checklist: RawCriteriaCheckItem[] | undefined
): RawCriteriaCheckItem[] | undefined {
  if (!checklist?.length) return checklist;

  return checklist.map((item) => {
    if (item.pass !== false) {
      const { severity: _s, ...rest } = item;
      return rest;
    }
    const severity =
      item.severity === "critical" ||
      item.severity === "moderate" ||
      item.severity === "minor"
        ? item.severity
        : inferSeverityFromNote(item.note) ?? "moderate";
    return { ...item, severity };
  });
}

export function computeCriteriaSeverityPenalty(
  checklist: RawCriteriaCheckItem[] | undefined,
  criteriaList: RawCriteria[]
): { creativePenalty: number; lpPenalty: number } {
  if (!checklist?.length) return { creativePenalty: 0, lpPenalty: 0 };

  const categoryById = new Map(criteriaList.map((c) => [c.id, c.category]));
  let creativePenalty = 0;
  let lpPenalty = 0;

  for (const item of checklist) {
    if (item.pass !== false) continue;

    const severity: CriteriaSeverityTier =
      item.severity === "critical" ||
      item.severity === "moderate" ||
      item.severity === "minor"
        ? item.severity
        : "moderate";

    const category = categoryById.get(item.id);
    if (category === "landing_page") {
      lpPenalty += LP_SEVERITY_WEIGHT[severity];
    } else {
      creativePenalty += CREATIVE_SEVERITY_WEIGHT[severity];
    }
  }

  return {
    creativePenalty: Math.min(creativePenalty, MAX_CREATIVE_PENALTY),
    lpPenalty: Math.min(lpPenalty, MAX_LP_PENALTY),
  };
}

/**
 * Adjusts strategic and conversion scores using severity-weighted checklist penalties.
 * Ensures two ads with the same fail count but different severities diverge meaningfully.
 */
export function applySeverityWeightedScores(input: {
  strategicScore: number;
  retentionScore: number;
  conversionTotal: number;
  checklist?: RawCriteriaCheckItem[];
  criteriaList?: RawCriteria[];
}): {
  strategicScore: number;
  retentionScore: number;
  conversionTotal: number;
} {
  const { creativePenalty, lpPenalty } = computeCriteriaSeverityPenalty(
    input.checklist,
    input.criteriaList ?? []
  );

  if (creativePenalty === 0 && lpPenalty === 0) {
    return {
      strategicScore: input.strategicScore,
      retentionScore: input.retentionScore,
      conversionTotal: input.conversionTotal,
    };
  }

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  // Retention flaws (C5, C7, C8) get a lighter touch — mostly strategic
  const retentionFlaws =
    input.checklist?.filter(
      (c) =>
        c.pass === false &&
        (c.id === "C5" || c.id === "C7" || c.id === "C8") &&
        c.severity === "critical"
    ).length ?? 0;
  const retentionPenalty =
    retentionFlaws > 0 ? Math.min(8, retentionFlaws * 4) : 0;

  return {
    strategicScore: clamp(input.strategicScore - creativePenalty),
    retentionScore: clamp(input.retentionScore - retentionPenalty),
    conversionTotal: clamp(input.conversionTotal - lpPenalty),
  };
}

/** Strip internal severity before persisting checklist to the report UI. */
export function stripSeverityFromChecklist(
  checklist: RawCriteriaCheckItem[] | undefined
): { id: string; pass: boolean | null; note?: string }[] | undefined {
  if (!checklist?.length) return undefined;
  return checklist.map(({ id, pass, note }) => ({ id, pass, note }));
}
