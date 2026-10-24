import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ANALYSIS_PLATFORMS } from "@/lib/analyses/constants";
import { purgeAnalysisCreativesAfterTerminalStatus } from "@/lib/analyses/creative-storage";
import { getOrGenerateBrandProfile } from "@/lib/ai/brand-profile";
import { formatBrandProfileForPrompt } from "@/lib/ai/brand-profile-prompt";
import { buildEvidenceContext } from "@/lib/ai/pipeline-prompts";
import { buildVisualIntelligence } from "@/lib/ai/visual-intelligence";
import { buildMarketIntelligence } from "@/lib/ai/market-intelligence";
import { runEvaluators } from "@/lib/ai/evaluators";
import { formatWorkerGeminiLog } from "@/lib/ai/retention-v3";
import { runScoringSynthesis } from "@/lib/ai/scoring";
import { withTimeout } from "@/lib/ai/pipeline/timeout";
import { logWorkerStage } from "@/lib/analyses/worker-reliability";
import { buildAnalysisReport } from "@/lib/report/build-report";
import { isScrapeContentSufficient, scrapePage } from "@/lib/ai/scrape";
import {
  getCreativeGoalEvaluationBlock,
  getCreativeGoalLabel,
  normalizeCreativeGoal,
} from "@/lib/analyses/creative-goals";
import type { MarketIntelligenceResult, VisualIntelligence } from "@/lib/ai/pipeline-types";
import type { Analysis } from "@/lib/types/analysis";
import type { AnalysisReport } from "@/lib/types/report";
import type { Workspace } from "@/lib/types/workspace";

/** Bound Job 1 (video/image analysis) so one slow/failed call can't exhaust the worker's time budget. */
const VISUAL_INTELLIGENCE_TIMEOUT_MS = 200_000;
/** Bound Job 2 (Tavily + Meta Ad Library) — non-critical, degrade gracefully on timeout. */
const MARKET_INTELLIGENCE_TIMEOUT_MS = 45_000;

export function platformText(analysis: Pick<Analysis, "platforms" | "platform_other">): string {
  const labels = analysis.platforms.map((id) => {
    if (id === "other" && analysis.platform_other) return analysis.platform_other;
    return ANALYSIS_PLATFORMS.find((p) => p.id === id)?.label ?? id;
  });
  return labels.length ? labels.join(", ") : "Unspecified platform";
}

function degradedVisualIntelligence(analysis: Analysis, reason: string): VisualIntelligence {
  const kind = analysis.creative_type;
  return {
    kind,
    briefText: `AD CREATIVE — ${kind.toUpperCase()}\n\n(Visual analysis timed out or failed: ${reason}. Evaluate using brand, platform, and landing-page context only.)`,
    sourceNotes: [`Visual intelligence degraded: ${reason}`],
  };
}

export type RunFullAnalysisResult = {
  report: AnalysisReport;
};

/**
 * Runs Jobs 1-5 for a single creative (funnel analysis or one comparison
 * variant) and returns the final report. Persistence is the caller's
 * responsibility so this function is reusable for both standalone analyses
 * and comparison variants.
 */
export async function runFullAnalysis(
  supabase: SupabaseClient,
  analysis: Analysis,
  workspace: Workspace,
  options: { marketIntelligence?: MarketIntelligenceResult } = {}
): Promise<RunFullAnalysisResult> {
  const platforms = platformText(analysis).split(", ").filter(Boolean);
  const creativeGoal = normalizeCreativeGoal(analysis.creative_goal);
  const creativeGoalLabel = getCreativeGoalLabel(creativeGoal);

  // Visual + scrape do not take brand as input — start them immediately so
  // brand-profile generation overlaps instead of blocking Job 1.
  const visualPromise = logWorkerStage("visual", analysis.id, () =>
    withTimeout(
      buildVisualIntelligence(supabase, analysis),
      VISUAL_INTELLIGENCE_TIMEOUT_MS,
      () => degradedVisualIntelligence(analysis, "timed out")
    ).catch((err) =>
      degradedVisualIntelligence(
        analysis,
        err instanceof Error ? err.message : "unknown error"
      )
    )
  );

  const scrapePromise = logWorkerStage("scrape", analysis.id, () =>
    analysis.landing_page_url
      ? scrapePage(analysis.landing_page_url)
      : Promise.resolve(null)
  );

  const brandProfile = await logWorkerStage("brand", analysis.id, () =>
    getOrGenerateBrandProfile(supabase, workspace)
  );
  const brandProfileText = formatBrandProfileForPrompt(brandProfile);

  // JOB 1 + JOB 2 — parallel. Landing page scrape runs alongside since it's
  // independent of both and needed before Job 3/4.
  const [visualIntelligence, marketIntelligence, lp] = await Promise.all([
    visualPromise,
    options.marketIntelligence
      ? Promise.resolve(options.marketIntelligence)
      : logWorkerStage("market", analysis.id, () =>
          withTimeout(
            buildMarketIntelligence(
              supabase,
              workspace.id,
              brandProfile.category || brandProfile.brandName,
              platforms
            ),
            MARKET_INTELLIGENCE_TIMEOUT_MS,
            (): MarketIntelligenceResult => ({ brief: null, degraded: true })
          )
        ),
    scrapePromise,
  ]);

  console.log(
    formatWorkerGeminiLog(analysis.id, {
      coldScrollStopScore: visualIntelligence.coldScrollStopScore,
      watchThroughScore: visualIntelligence.watchThroughScore,
      openingFeatures: visualIntelligence.openingFeatures,
    })
  );

  const landingPageStatus: "ok" | "partial" | "failed" = !lp
    ? "failed"
    : lp.ok
      ? isScrapeContentSufficient(lp)
        ? "ok"
        : "partial"
      : "failed";
  const landingPageText = lp?.asPromptText ?? "(No landing page URL was provided.)";

  const evidenceContext = buildEvidenceContext({
    brandProfileText,
    platformText: platformText(analysis),
    creativeGoalLabel,
    creativeGoalEvaluationBlock: getCreativeGoalEvaluationBlock(creativeGoal),
    creativeBriefText: visualIntelligence.briefText,
    creativeKind: visualIntelligence.kind,
    landingPageText,
    landingPageStatus,
    marketIntelligenceText: marketIntelligence.briefText,
  });

  // JOB 3 — two independent evaluators, parallel (inside runEvaluators).
  const { viewer, performanceExpert } = await logWorkerStage(
    "evaluators",
    analysis.id,
    () =>
      runEvaluators({
        cachedContext: evidenceContext,
      })
  );

  // JOB 4 — single scoring/synthesis call. Composites computed deterministically inside.
  const scoring = await logWorkerStage("scoring", analysis.id, () =>
    runScoringSynthesis({
    cachedContext: evidenceContext,
    prompt: [
      "=== REAL VIEWER TRANSCRIPT ===",
      viewer.raw,
      "",
      "=== PERFORMANCE EXPERT TRANSCRIPT ===",
      performanceExpert.raw,
      "",
      "Score this ad now using the evidence above. Output the complete JSON report.",
    ].join("\n"),
    fallbacks: {
      viewerRaw: viewer.raw,
      performanceExpertRaw: performanceExpert.raw,
    },
    analysisId: analysis.id,
    visualRetentionSignals:
      visualIntelligence.kind === "video"
        ? {
            coldScrollStopScore: visualIntelligence.coldScrollStopScore,
            watchThroughScore: visualIntelligence.watchThroughScore,
            dropOffMoments: visualIntelligence.dropOffMoments,
            openingFeatures: visualIntelligence.openingFeatures,
            visualAnalysisMode: visualIntelligence.videoContext?.visualAnalysisMode,
          }
        : undefined,
    })
  );

  // JOB 5 — deterministic formatting into the existing report schema.
  const report = buildAnalysisReport({
    scoring,
    visualIntelligence,
    marketIntelligence,
    viewer,
    performanceExpert,
    landingPageStatus,
    lpError: lp?.error,
    brandProfilePartial: brandProfile.partial,
  });

  return { report };
}

/**
 * Runs the full analysis pipeline for a standalone (funnel) analysis row and
 * persists the structured report. Throws on unrecoverable failure (caller
 * marks the analysis "failed").
 */
export async function runAnalysisPipeline(
  supabase: SupabaseClient,
  analysis: Analysis,
  workspace: Workspace
): Promise<void> {
  const { report } = await runFullAnalysis(supabase, analysis, workspace);

  await logWorkerStage("persist", analysis.id, async () => {
    const { data, error } = await supabase
      .from("analyses")
      .update({
        report,
        funnel_score: report.overallFunnelScore,
        conversion_score: report.conversionScore.total,
        creative_strength_score: report.creativeStrengthScore,
        status: "completed",
        error_message: null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", analysis.id)
      .eq("status", "processing")
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to save report: ${error.message}`);
    }
    if (!data) {
      return;
    }

    // Result is durable — delete the uploaded creative. Keep video thumbnails for list UI.
    await purgeAnalysisCreativesAfterTerminalStatus(supabase, analysis);
  });
}
