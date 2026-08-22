import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaudeJSON } from "@/lib/ai/client";
import { evaluateCreative } from "@/lib/ai/evaluate-creative";
import { getOrGenerateBrandProfile } from "@/lib/ai/brand-profile";
import { buildMarketIntelligence } from "@/lib/ai/market-intelligence";
import {
  COMPARISON_SYNTHESIS_SYSTEM,
  buildComparisonScopeBlock,
} from "@/lib/ai/prompts";
import { ANALYSIS_PLATFORMS, COMPARISON_PLATFORMS } from "@/lib/analyses/constants";
import {
  getCreativeGoalEvaluationBlock,
  getCreativeGoalLabel,
  normalizeCreativeGoal,
} from "@/lib/analyses/creative-goals";
import type { Analysis } from "@/lib/types/analysis";
import type { AnalysisReport } from "@/lib/types/report";
import type {
  ComparisonReport,
  ComparisonRanking,
  ComparisonTestDimension,
  ComparisonVariantDetail,
  StoredAnalysisVariant,
} from "@/lib/types/comparison";
import type { Workspace } from "@/lib/types/workspace";

const DIMENSION_LABELS: Record<ComparisonTestDimension, string> = {
  hook: "Hook / Opening",
  script_copy: "Script / Copy",
  visual_style: "Visual Style",
  cta: "CTA",
  full_creative: "Full Creative",
};

function platformLabel(platform: string, platformOther?: string | null): string {
  if (platform === "other" && platformOther) return platformOther;
  return (
    COMPARISON_PLATFORMS.find((p) => p.id === platform)?.label ??
    ANALYSIS_PLATFORMS.find((p) => p.id === platform)?.label ??
    platform
  );
}

function variantAsAnalysisRow(
  analysis: Analysis,
  variant: StoredAnalysisVariant
): Analysis {
  return {
    ...analysis,
    creative_type: variant.creative_type,
    script_content: variant.script_content ?? null,
    creative_storage_path: variant.creative_storage_path ?? null,
    creative_file_name: variant.creative_file_name ?? null,
    creative_mime_type: variant.creative_mime_type ?? null,
    thumbnail_url: variant.thumbnail_url ?? null,
  };
}

type IndividualEvalResult = {
  variantId: string;
  label: string;
  score: number;
  creativeStrengthScore: number;
  conversionScore: number;
  scoreBreakdown: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  improvements: string | null;
  productionNote: string | null;
  summary: string;
  analysisReport: AnalysisReport;
};

function enforceRankingsFromScores(
  rankings: ComparisonRanking[],
  individualResults: IndividualEvalResult[]
): ComparisonRanking[] {
  const scoreById = new Map(individualResults.map((r) => [r.variantId, r.score]));

  return rankings
    .map((r) => ({ ...r, score: scoreById.get(r.variantId) ?? r.score }))
    .sort((a, b) => a.rank - b.rank);
}

function buildRankingsFromScores(
  individualResults: IndividualEvalResult[],
  synthesisRankings: ComparisonRanking[]
): ComparisonRanking[] {
  if (synthesisRankings.length === individualResults.length) {
    return enforceRankingsFromScores(synthesisRankings, individualResults);
  }

  const reasonById = new Map(synthesisRankings.map((r) => [r.variantId, r.reason]));

  return [...individualResults]
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({
      variantId: r.variantId,
      label: r.label,
      rank: i + 1,
      score: r.score,
      reason:
        reasonById.get(r.variantId) ??
        r.summary ??
        "Ranked by calibrated individual score.",
    }));
}

/**
 * Runs the same Job 1-5 measurement pipeline once per variant (Pass 1,
 * parallel), sharing a single market-intelligence brief across all variants
 * since they share the same brand/category/platform — avoids N redundant
 * Tavily/Meta calls. Pass 2 is a lightweight ranking/insights synthesis over
 * the already-calibrated individual scores — it does not re-score anything.
 */
export async function runComparisonPipeline(
  supabase: SupabaseClient,
  analysis: Analysis,
  workspace: Workspace
): Promise<void> {
  const variants = (analysis.variants ?? []) as StoredAnalysisVariant[];
  if (variants.length < 2) {
    throw new Error("Comparison requires at least 2 variants.");
  }

  const dimensions =
    (analysis.comparison_test_dimensions as ComparisonTestDimension[]) ?? [
      "full_creative",
    ];
  const platform = analysis.platforms[0] ?? "meta_feed";
  const platformTextValue = platformLabel(platform, analysis.platform_other);
  const dimensionLabels = dimensions.map((d) => DIMENSION_LABELS[d]);
  const creativeGoal = normalizeCreativeGoal(analysis.creative_goal);

  const brandProfile = await getOrGenerateBrandProfile(supabase, workspace);

  const marketIntelligence = await buildMarketIntelligence(
    supabase,
    workspace.id,
    brandProfile.category || brandProfile.brandName,
    [platformTextValue]
  );

  // Pass 1 — per variant: identical Job 1-5 pipeline as standalone analysis.
  const individualResults: IndividualEvalResult[] = await Promise.all(
    variants.map(async (variant) => {
      const variantRow = variantAsAnalysisRow(analysis, variant);
      const evaluation = await evaluateCreative(
        supabase,
        variantRow,
        workspace,
        marketIntelligence,
        { testDimensions: dimensions }
      );

      return {
        variantId: variant.id,
        label: variant.label,
        score: evaluation.score,
        creativeStrengthScore: evaluation.creativeStrengthScore,
        conversionScore: evaluation.conversionScore,
        scoreBreakdown: evaluation.scoreBreakdown,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        improvements: evaluation.improvements,
        productionNote: evaluation.productionNote,
        summary: evaluation.summary,
        analysisReport: evaluation.analysisReport,
      };
    })
  );

  const variantDetails: ComparisonVariantDetail[] = individualResults.map((r) => ({
    variantId: r.variantId,
    label: r.label,
    score: r.score,
    creativeStrengthScore: r.creativeStrengthScore,
    conversionScore: r.conversionScore,
    scoreBreakdown: r.scoreBreakdown,
    strengths: r.strengths,
    weaknesses: r.weaknesses,
    improvements: r.improvements,
    productionNote: r.productionNote,
    analysisReport: r.analysisReport,
  }));

  // Pass 2 — comparative synthesis (ranking + insights; scores anchored to pass 1).
  const synthesis = await callClaudeJSON<Omit<ComparisonReport, "variantDetails">>({
    system: COMPARISON_SYNTHESIS_SYSTEM,
    prompt: [
      "=== CREATIVE GOAL (read first — comparison calibrated to this goal) ===",
      `Goal: ${getCreativeGoalLabel(creativeGoal)}`,
      getCreativeGoalEvaluationBlock(creativeGoal),
      "",
      buildComparisonScopeBlock(dimensionLabels, "ALL VARIANTS"),
      "",
      "=== PLATFORM ===",
      platformTextValue,
      "",
      "=== TEST DIMENSIONS ===",
      dimensionLabels.join(", "),
      "",
      "=== CALIBRATED INDIVIDUAL SCORES (use these exact scores in rankings) ===",
      JSON.stringify(
        individualResults.map((r) => ({
          variantId: r.variantId,
          label: r.label,
          score: r.score,
          summary: r.summary,
          strengths: r.strengths,
          weaknesses: r.weaknesses,
        })),
        null,
        2
      ),
      ...(marketIntelligence.briefText
        ? [
            "",
            marketIntelligence.briefText,
            "",
            "Benchmark variants against market intelligence above. Which variant is most likely to outperform competitors on hook, style, and positioning?",
          ]
        : []),
      "",
      "Produce the head-to-head comparison report JSON. Do not change scores.",
    ].join("\n"),
    maxTokens: 5120,
    temperature: 0.6,
  });

  const rankings = buildRankingsFromScores(individualResults, synthesis.rankings ?? []);

  const winnerEntry =
    rankings.find((r) => r.rank === 1) ?? rankings[0] ?? individualResults[0];

  const report: ComparisonReport = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    testDimensions: dimensions,
    platform: platformTextValue,
    winnerVariantId: synthesis.winnerVariantId ?? winnerEntry.variantId,
    winnerVerdict:
      synthesis.winnerVerdict ??
      `${winnerEntry.label} wins this comparison on the tested dimension(s).`,
    rankings,
    variantDetails,
    keyInsights: synthesis.keyInsights ?? {
      decidingFactor: "",
      pattern: "",
      nextTest: "",
    },
    noneStrongEnough:
      synthesis.noneStrongEnough ?? individualResults.every((r) => r.score < 65),
    recommendedHybrid: synthesis.recommendedHybrid,
    structuralDifferences: synthesis.structuralDifferences ?? "",
    competitiveInsights: synthesis.competitiveInsights?.length
      ? synthesis.competitiveInsights
      : marketIntelligence.brief?.competitiveInsights,
  };

  const winner = rankings.find((r) => r.rank === 1) ?? rankings[0];
  const winnerResult = individualResults.find((r) => r.variantId === winner?.variantId);

  const updatedVariants: StoredAnalysisVariant[] = variants.map((v) => {
    const detail = variantDetails.find((d) => d.variantId === v.id);
    return {
      ...v,
      score: detail?.score,
      strengths: detail?.strengths,
      weaknesses: detail?.weaknesses,
      improvements: detail?.improvements ?? null,
      production_note: detail?.productionNote ?? null,
      score_breakdown: detail?.scoreBreakdown,
    };
  });

  const winnerVariant = updatedVariants.find((v) => v.id === winner?.variantId);

  const { error } = await supabase
    .from("analyses")
    .update({
      report,
      variants: updatedVariants,
      funnel_score: winnerResult?.score ?? winner?.score ?? null,
      creative_strength_score: winnerResult?.creativeStrengthScore ?? null,
      conversion_score: winnerResult?.conversionScore ?? null,
      thumbnail_url: winnerVariant?.thumbnail_url ?? variants[0].thumbnail_url ?? null,
      status: "completed",
      error_message: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", analysis.id);

  if (error) {
    throw new Error(`Failed to save comparison report: ${error.message}`);
  }
}
