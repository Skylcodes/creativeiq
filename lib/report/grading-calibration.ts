import type { RawCriteriaCheckItem } from "@/lib/report/severity-scoring";
import type { AnalysisReport } from "@/lib/types/report";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/** Organic hold tier inferred from agent transcripts (no extra API calls). */
export type OrganicHoldTier =
  | "exceptional"
  | "strong"
  | "average"
  | "weak"
  | "poor";

const RETENTION_TIER_ANCHOR: Record<OrganicHoldTier, number> = {
  exceptional: 91,
  strong: 83,
  average: 67,
  weak: 51,
  poor: 36,
};

function tierToVerdict(tier: OrganicHoldTier): string {
  switch (tier) {
    case "exceptional":
      return "Exceptional organic hold — likely above-average distribution in this niche.";
    case "strong":
      return "Above-average organic hold — opening earns attention and most viewers reach the core message.";
    case "average":
      return "Average organic hold — workable for paid distribution; some viewers drop before the payoff.";
    case "weak":
      return "Below-average organic hold — many viewers skip before the message lands.";
    case "poor":
      return "Poor organic hold — as feed content this would die early; most viewers skip in the first seconds.";
  }
}

function mapVerdictWord(word: string): OrganicHoldTier | null {
  const w = word.toLowerCase().replace(/\s+/g, "");
  if (w.includes("exceptional") || w.includes("outstanding")) return "exceptional";
  if (w.includes("aboveaverage") || w === "strong") return "strong";
  if (w === "average" || w === "decent" || w === "okay") return "average";
  if (w.includes("belowaverage") || w === "weak") return "weak";
  if (w === "poor" || w.includes("die")) return "poor";
  return null;
}

/**
 * Extract organic watchability tier from Skeptical Buyer + DR Critic transcripts.
 * Agents are instructed to end with explicit retention verdicts — use those as anchors.
 */
export function extractOrganicHoldTier(...texts: string[]): OrganicHoldTier | null {
  const combined = texts.filter(Boolean).join("\n");
  if (!combined.trim()) return null;

  const verdictLine = combined.match(
    /RETENTION\s+VERDICT[:\s—-]+([^\n.]{0,120})/i
  );
  if (verdictLine?.[1]) {
    const tier = mapVerdictWord(verdictLine[1]);
    if (tier) return tier;
    if (/above[\s-]?average/i.test(verdictLine[1])) return "strong";
    if (/below[\s-]?average/i.test(verdictLine[1])) return "weak";
    if (/\bpoor\b/i.test(verdictLine[1])) return "poor";
  }

  const organicTail = combined.match(
    /as organic content[^.\n]{0,160}\b(get pushed|stay average|die(?:\s+at)?(?:\s+200\s+views)?|buried|suppressed)\b/i
  );
  if (organicTail?.[1]) {
    const phrase = organicTail[1].toLowerCase();
    if (phrase.includes("pushed")) return "strong";
    if (phrase.includes("average")) return "average";
    return "poor";
  }

  const staticThumb = combined.match(
    /as a static post[^.\n]{0,120}\b(stop|scroll past)\b/i
  );
  if (staticThumb?.[1]) {
    return staticThumb[1].toLowerCase() === "stop" ? "strong" : "weak";
  }

  if (/\bdie (?:at|after) 200 views\b/i.test(combined)) return "poor";
  if (/\b(?:would|will) get pushed\b/i.test(combined)) return "strong";
  if (/\bstay (?:flat|average)\b/i.test(combined)) return "average";

  return null;
}

export function calibrateRetentionFromAgents(input: {
  synthesisRetention: number;
  buyerText: string;
  drCriticText: string;
  creativeKind: AnalysisReport["flags"]["creativeKind"];
  existingVerdict?: string;
}): {
  retentionScore: number;
  retentionVerdict?: string;
} {
  const tier = extractOrganicHoldTier(input.drCriticText, input.buyerText);
  if (!tier) {
    return {
      retentionScore: input.synthesisRetention,
      retentionVerdict: input.existingVerdict,
    };
  }

  const anchor = RETENTION_TIER_ANCHOR[tier];
  const synth = input.synthesisRetention;
  let retentionScore: number;

  // Agent tier is the primary signal when synthesis diverges by 12+ points.
  if (Math.abs(synth - anchor) >= 12) {
    retentionScore = clamp(Math.round(anchor * 0.7 + synth * 0.3), 0, 100);
  } else {
    retentionScore = clamp(Math.round((anchor + synth) / 2), 0, 100);
  }

  // Static/script: slightly less aggressive tier mapping (no motion to judge).
  if (input.creativeKind === "image" || input.creativeKind === "script") {
    retentionScore = clamp(
      Math.round(retentionScore * 0.85 + synth * 0.15),
      0,
      100
    );
  }

  return {
    retentionScore,
    retentionVerdict: input.existingVerdict?.trim() || tierToVerdict(tier),
  };
}

export type ChecklistQualityStats = {
  applicable: number;
  passed: number;
  failed: number;
  criticalFails: number;
  moderateFails: number;
  minorFails: number;
  passRate: number;
};

export function summarizeChecklistQuality(
  checklist: RawCriteriaCheckItem[] | undefined
): ChecklistQualityStats {
  const empty: ChecklistQualityStats = {
    applicable: 0,
    passed: 0,
    failed: 0,
    criticalFails: 0,
    moderateFails: 0,
    minorFails: 0,
    passRate: 1,
  };
  if (!checklist?.length) return empty;

  let applicable = 0;
  let passed = 0;
  let failed = 0;
  let criticalFails = 0;
  let moderateFails = 0;
  let minorFails = 0;

  for (const item of checklist) {
    if (item.pass === null) continue;
    applicable += 1;
    if (item.pass === true) {
      passed += 1;
      continue;
    }
    failed += 1;
    if (item.severity === "critical") criticalFails += 1;
    else if (item.severity === "moderate") moderateFails += 1;
    else minorFails += 1;
  }

  return {
    applicable,
    passed,
    failed,
    criticalFails,
    moderateFails,
    minorFails,
    passRate: applicable > 0 ? passed / applicable : 1,
  };
}

/**
 * Deterministic score floors/caps so strong creatives aren't dragged down by
 * checklist noise or weak synthesis — without extra API calls.
 */
export function applyPerformanceCalibration(input: {
  strategicScore: number;
  retentionScore: number;
  conversionTotal: number;
  checklist?: RawCriteriaCheckItem[];
  topBlockersCount: number;
  organicTier: OrganicHoldTier | null;
}): {
  strategicScore: number;
  retentionScore: number;
  conversionTotal: number;
} {
  const stats = summarizeChecklistQuality(input.checklist);
  let strategic = input.strategicScore;
  let retention = input.retentionScore;
  let conversion = input.conversionTotal;

  // Floors: high checklist pass rate + no critical flaws = ad fundamentals work.
  if (stats.criticalFails === 0 && input.topBlockersCount === 0) {
    if (stats.passRate >= 0.88 && stats.applicable >= 4) {
      strategic = Math.max(strategic, 76);
      retention = Math.max(retention, 72);
    } else if (stats.passRate >= 0.75 && stats.applicable >= 4) {
      strategic = Math.max(strategic, 68);
      retention = Math.max(retention, 64);
    }
  }

  // Caps: poor organic tier from agents cannot be masked by optimistic synthesis.
  if (input.organicTier === "poor") {
    retention = Math.min(retention, 48);
  } else if (input.organicTier === "weak") {
    retention = Math.min(retention, 58);
  } else if (input.organicTier === "strong" || input.organicTier === "exceptional") {
    retention = Math.max(retention, input.organicTier === "exceptional" ? 84 : 76);
  }

  // Weak fundamentals: many critical checklist failures or blockers — don't inflate.
  if (stats.criticalFails >= 2 || input.topBlockersCount >= 2) {
    strategic = Math.min(strategic, 62);
    retention = Math.min(retention, 58);
    conversion = Math.min(conversion, 58);
  } else if (stats.criticalFails === 1) {
    strategic = Math.min(strategic, 72);
  }

  return {
    strategicScore: clamp(strategic, 0, 100),
    retentionScore: clamp(retention, 0, 100),
    conversionTotal: clamp(conversion, 0, 100),
  };
}

export type TrimmableReportFields = {
  topBlockers?: AnalysisReport["topBlockers"];
  priorityActions?: AnalysisReport["priorityActions"];
  hookVariants?: AnalysisReport["hookVariants"];
};

/** Remove manufactured criticism when scores show a strong ad. */
export function trimRecommendationsForScore(
  fields: TrimmableReportFields,
  creativeStrengthScore: number
): TrimmableReportFields {
  if (creativeStrengthScore >= 82) {
    return {
      ...fields,
      topBlockers: (fields.topBlockers ?? []).filter(
        (b) => b.severity === "critical"
      ).slice(0, 1),
      priorityActions: (fields.priorityActions ?? [])
        .filter((a) => a.impact === "high")
        .slice(0, 2),
      hookVariants: (fields.hookVariants ?? []).slice(0, 3),
    };
  }

  if (creativeStrengthScore >= 74) {
    return {
      ...fields,
      topBlockers: (fields.topBlockers ?? [])
        .filter((b) => b.severity !== "medium")
        .slice(0, 2),
      priorityActions: (fields.priorityActions ?? []).slice(0, 3),
    };
  }

  return fields;
}
