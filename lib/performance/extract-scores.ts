import { ANALYSIS_PLATFORMS } from "@/lib/analyses/constants";
import { getCreativeGoalLabel, normalizeCreativeGoal } from "@/lib/analyses/creative-goals";
import { getAnalysisVerdict } from "@/lib/analyses/utils";
import { isComparisonReport } from "@/lib/report/normalize-comparison";
import { categoryPercent } from "@/lib/report/utils";
import type { Analysis } from "@/lib/types/analysis";
import type { AnalysisReport, ConversionCategoryKey } from "@/lib/types/report";
import type { CategoryScoreKey, PerformanceAnalysisPoint } from "./types";

const LP_CATEGORY_KEYS: ConversionCategoryKey[] = [
  "message_match",
  "hook_strength",
  "social_proof",
  "offer_clarity",
  "lead_magnet_clarity",
  "objection_handling",
  "visual_ux",
  "funnel_continuity",
  "brand_memorability",
];

function platformLabel(analysis: Analysis): string {
  const labels = analysis.platforms.map((id) => {
    if (id === "other" && analysis.platform_other) return analysis.platform_other;
    return ANALYSIS_PLATFORMS.find((p) => p.id === id)?.label ?? id;
  });
  return labels.length ? labels.join(" · ") : "—";
}

function extractCategoryScores(analysis: Analysis): Partial<Record<CategoryScoreKey, number>> {
  const scores: Partial<Record<CategoryScoreKey, number>> = {};

  if (analysis.analysis_mode === "comparison" || isComparisonReport(analysis.report)) {
    const score = analysis.funnel_score ?? analysis.creative_strength_score;
    if (score !== null && score !== undefined) {
      scores.creative_strength = score;
    }
    return scores;
  }

  const report = analysis.report as AnalysisReport | null;
  if (!report) {
    if (analysis.creative_strength_score != null) {
      scores.creative_strength = analysis.creative_strength_score;
    }
    return scores;
  }

  if (report.creativeStrengthScore != null) {
    scores.creative_strength = report.creativeStrengthScore;
  } else if (analysis.creative_strength_score != null) {
    scores.creative_strength = analysis.creative_strength_score;
  }

  for (const cat of report.conversionScore?.categories ?? []) {
    if (LP_CATEGORY_KEYS.includes(cat.key as ConversionCategoryKey)) {
      scores[cat.key as CategoryScoreKey] = categoryPercent(cat);
    }
  }

  return scores;
}

export function analysisToPerformancePoint(analysis: Analysis): PerformanceAnalysisPoint | null {
  const score = analysis.funnel_score;
  if (score === null || analysis.status !== "completed") return null;

  const isComparison =
    analysis.analysis_mode === "comparison" || isComparisonReport(analysis.report);

  return {
    id: analysis.id,
    title: analysis.title,
    date: analysis.completed_at ?? analysis.created_at,
    score,
    verdict: getAnalysisVerdict(analysis),
    platformsLabel: platformLabel(analysis),
    primaryPlatform: analysis.platforms[0] ?? "other",
    isComparison,
    variantCount: isComparison ? (analysis.variants?.length ?? null) : null,
    delta: null,
    creativeGoalLabel: getCreativeGoalLabel(normalizeCreativeGoal(analysis.creative_goal)),
    categoryScores: extractCategoryScores(analysis),
  };
}

export const CATEGORY_DEFINITIONS: { key: CategoryScoreKey; label: string }[] = [
  { key: "creative_strength", label: "Creative Strength" },
  { key: "message_match", label: "Message Match" },
  { key: "hook_strength", label: "Hook Strength" },
  { key: "social_proof", label: "Social Proof" },
  { key: "offer_clarity", label: "Offer Clarity" },
  { key: "lead_magnet_clarity", label: "Lead Magnet Clarity" },
  { key: "objection_handling", label: "Objection Handling" },
  { key: "visual_ux", label: "Visual & UX" },
  { key: "funnel_continuity", label: "Funnel Continuity" },
  { key: "brand_memorability", label: "Brand Memorability" },
];
