import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaudeJSON, type ImageInput } from "@/lib/ai/client";
import { evaluateCreative } from "@/lib/ai/evaluate-creative";
import { getOrGenerateBrandProfile } from "@/lib/ai/brand-profile";
import { formatBrandProfileForPrompt } from "@/lib/ai/brand-profile-prompt";
import { buildIntelligenceBrief, formatIntelligenceForPrompt } from "@/lib/ai/intelligence";
import {
  buildImageCreativeBrief,
  describeImageCreative,
} from "@/lib/ai/image-creative";
import { captureHooksFromAnalysis } from "@/lib/hooks/capture";
import {
  COMPARISON_SYNTHESIS_SYSTEM,
  buildComparisonScopeBlock,
} from "@/lib/ai/prompts";
import { scrapePage } from "@/lib/ai/scrape";
import { buildVideoBrief, processVideoCreative } from "@/lib/ai/video";
import { ANALYSIS_PLATFORMS, COMPARISON_PLATFORMS } from "@/lib/analyses/constants";
import {
  getCreativeGoalEvaluationBlock,
  getCreativeGoalLabel,
  normalizeCreativeGoal,
} from "@/lib/analyses/creative-goals";
import type { Analysis } from "@/lib/types/analysis";
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

async function buildVariantCreative(
  supabase: SupabaseClient,
  analysis: Analysis,
  variant: StoredAnalysisVariant
): Promise<{ text: string; image?: ImageInput; visionImage?: ImageInput; kind: string }> {
  const row = variantAsAnalysisRow(analysis, variant);

  if (variant.creative_type === "script") {
    return {
      text: variant.script_content?.trim() || "(No script content provided.)",
      kind: "script",
    };
  }

  if (variant.creative_type === "video") {
    const videoCtx = await processVideoCreative(supabase, row);
    const { text } = buildVideoBrief(videoCtx, variant.creative_file_name ?? undefined);
    return { text, kind: "video" };
  }

  const path = variant.creative_storage_path;
  if (!path) return { text: "(Image creative missing.)", kind: "image" };

  try {
    const { data, error } = await supabase.storage
      .from("analysis-creatives")
      .download(path);
    if (error || !data) throw new Error(error?.message ?? "download failed");
    const buffer = Buffer.from(await data.arrayBuffer());
    const mediaType =
      variant.creative_mime_type === "image/png" ? "image/png" : "image/jpeg";
    const image: ImageInput = {
      mediaType,
      base64Data: buffer.toString("base64"),
    };
    const visualDescription = await describeImageCreative(
      image,
      variant.creative_file_name ?? undefined
    );
    const text = buildImageCreativeBrief(
      visualDescription,
      variant.creative_file_name ?? undefined
    );
    return {
      text,
      visionImage: image,
      kind: "image",
    };
  } catch {
    return {
      text: `Image creative could not be loaded (variant: "${variant.label}"). Proceed using brand, platform, and landing-page context and flag that the image was unavailable.`,
      kind: "image",
    };
  }
}

type IndividualEvalResult = {
  variantId: string;
  label: string;
  score: number;
  scoreBreakdown: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  improvements: string | null;
  productionNote: string | null;
  summary: string;
};

function enforceRankingsFromScores(
  rankings: ComparisonRanking[],
  individualResults: IndividualEvalResult[]
): ComparisonRanking[] {
  const scoreById = new Map(
    individualResults.map((r) => [r.variantId, r.score])
  );

  return rankings
    .map((r) => ({
      ...r,
      score: scoreById.get(r.variantId) ?? r.score,
    }))
    .sort((a, b) => a.rank - b.rank);
}

function buildRankingsFromScores(
  individualResults: IndividualEvalResult[],
  synthesisRankings: ComparisonRanking[]
): ComparisonRanking[] {
  if (synthesisRankings.length === individualResults.length) {
    return enforceRankingsFromScores(synthesisRankings, individualResults);
  }

  const reasonById = new Map(
    synthesisRankings.map((r) => [r.variantId, r.reason])
  );

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
  const platformText = platformLabel(platform, analysis.platform_other);
  const dimensionLabels = dimensions.map((d) => DIMENSION_LABELS[d]);

  const brandProfile = await getOrGenerateBrandProfile(supabase, workspace);
  const brandProfileText = formatBrandProfileForPrompt(brandProfile);

  const [intelligenceBrief, lp] = await Promise.all([
    buildIntelligenceBrief(
      supabase,
      workspace.id,
      brandProfile.category || brandProfile.brandName,
      [platformText]
    ).catch(() => null),
    analysis.landing_page_url
      ? scrapePage(analysis.landing_page_url)
      : Promise.resolve(null),
  ]);

  const landingPageStatus: "ok" | "partial" | "failed" = !lp
    ? "failed"
    : lp.ok
      ? lp.bodyText.length > 200
        ? "ok"
        : "partial"
      : "failed";
  const landingPageText =
    lp?.asPromptText ?? "(No landing page URL was provided.)";
  const intelligenceBriefText = intelligenceBrief
    ? formatIntelligenceForPrompt(intelligenceBrief)
    : undefined;

  // Pass 1 — per variant: DR Critic + Skeptical Buyer → calibrated extraction
  const individualResults: IndividualEvalResult[] = await Promise.all(
    variants.map(async (variant) => {
      const creative = await buildVariantCreative(supabase, analysis, variant);

      const evaluation = await evaluateCreative({
        brandProfileText,
        creativeText: creative.text,
        creativeIsImage: Boolean(creative.image),
        creativeIsVideo: creative.kind === "video",
        creativeGoal: analysis.creative_goal,
        landingPageText,
        landingPageStatus,
        platformText,
        intelligenceBriefText,
        visionImage: creative.visionImage,
        variantLabel: variant.label,
        testDimensions: dimensions,
      });

      return {
        variantId: variant.id,
        label: variant.label,
        score: evaluation.score,
        scoreBreakdown: evaluation.scoreBreakdown,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        improvements: evaluation.improvements,
        productionNote: evaluation.productionNote,
        summary: evaluation.summary,
      };
    })
  );

  const variantDetails: ComparisonVariantDetail[] = individualResults.map(
    (r) => ({
      variantId: r.variantId,
      label: r.label,
      score: r.score,
      scoreBreakdown: r.scoreBreakdown,
      strengths: r.strengths,
      weaknesses: r.weaknesses,
      improvements: r.improvements,
      productionNote: r.productionNote,
    })
  );

  const creativeGoal = normalizeCreativeGoal(analysis.creative_goal);

  // Pass 2 — comparative synthesis (ranking + insights; scores anchored to pass 1)
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
      platformText,
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
      "",
      "Produce the head-to-head comparison report JSON. Do not change scores.",
    ].join("\n"),
    maxTokens: 5120,
    temperature: 0.6,
  });

  const rankings = buildRankingsFromScores(
    individualResults,
    synthesis.rankings ?? []
  );

  const winnerEntry =
    rankings.find((r) => r.rank === 1) ?? rankings[0] ?? individualResults[0];

  const report: ComparisonReport = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    testDimensions: dimensions,
    platform: platformText,
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
      synthesis.noneStrongEnough ??
      individualResults.every((r) => r.score < 65),
    recommendedHybrid: synthesis.recommendedHybrid,
    structuralDifferences: synthesis.structuralDifferences ?? "",
  };

  const winner = rankings.find((r) => r.rank === 1) ?? rankings[0];

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
      funnel_score: winner?.score ?? null,
      creative_strength_score: winner?.score ?? null,
      conversion_score: null,
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

  await captureHooksFromAnalysis(supabase, analysis, report, workspace.user_id);
}
