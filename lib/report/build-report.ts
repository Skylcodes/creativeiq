import "server-only";

import { VERDICT_LABEL_TEXT } from "@/lib/ai/scoring";
import { sanitizeScriptRewrite } from "@/lib/report/script-rewrite";
import type {
  MarketIntelligenceResult,
  PerformanceEvaluation,
  ScoringResult,
  ViewerEvaluation,
  VisualIntelligence,
} from "@/lib/ai/pipeline-types";
import type { AnalysisReport } from "@/lib/types/report";

function messagingQualityScore(watchThroughScore: number): number {
  return Math.max(0, Math.min(100, Math.round(watchThroughScore * 2)));
}

export type BuildAnalysisReportInput = {
  scoring: ScoringResult;
  visualIntelligence: VisualIntelligence;
  marketIntelligence: MarketIntelligenceResult;
  viewer: ViewerEvaluation;
  performanceExpert: PerformanceEvaluation;
  landingPageStatus: "ok" | "partial" | "failed";
  lpError?: string;
  brandProfilePartial?: boolean;
};

/**
 * JOB 5 — deterministic formatting. Parses/validates already happened in
 * `runScoringSynthesis`; this step only maps validated evidence into the
 * exact JSON shape the existing report UI expects. No LLM calls here.
 */
export function buildAnalysisReport(input: BuildAnalysisReportInput): AnalysisReport {
  const { scoring, visualIntelligence, marketIntelligence } = input;

  const flagsNotes: string[] = [...visualIntelligence.sourceNotes];
  if (input.landingPageStatus !== "ok") {
    flagsNotes.push(
      input.landingPageStatus === "failed"
        ? `Landing page could not be fully analyzed${input.lpError ? ` (${input.lpError})` : ""}.`
        : "Landing page returned limited content; some scoring is conservative."
    );
  }
  if (input.brandProfilePartial) {
    flagsNotes.push("Brand profile was derived from limited data.");
  }
  if (marketIntelligence.degraded) {
    flagsNotes.push(
      "Market intelligence (Tavily/Meta Ad Library) was unavailable for this analysis — competitive claims are omitted rather than fabricated."
    );
  }

  const competitiveInsights = [
    ...(scoring.competitiveInsights ?? []),
    ...(marketIntelligence.brief?.competitiveInsights ?? []),
  ]
    .filter((v, i, arr) => Boolean(v) && arr.indexOf(v) === i)
    .slice(0, 5);

  const verdictText = `${VERDICT_LABEL_TEXT[scoring.verdict.label]} — ${scoring.verdict.rationale}`;

  const videoContext: AnalysisReport["videoContext"] = visualIntelligence.videoContext
    ? {
        transcript: visualIntelligence.videoContext.transcript,
        primaryMessaging: visualIntelligence.videoContext.primaryMessaging,
        backgroundAudioNote: visualIntelligence.videoContext.backgroundAudioNote,
        onScreenText: visualIntelligence.videoContext.onScreenText,
        transcriptAvailable: visualIntelligence.videoContext.transcriptAvailable,
        visualDescription: visualIntelligence.videoContext.visualDescription,
        visualTimeline: visualIntelligence.videoContext.visualTimeline,
        frameCount: visualIntelligence.videoContext.frameCount,
        analyzedDurationSec: visualIntelligence.videoContext.analyzedDurationSec,
        videoDurationSec: visualIntelligence.videoContext.videoDurationSec,
        visualAnalysisMode: visualIntelligence.videoContext.visualAnalysisMode,
        coldScrollStopScore: visualIntelligence.coldScrollStopScore,
        watchThroughScore: visualIntelligence.watchThroughScore,
        processingNotes: visualIntelligence.videoContext.processingNotes,
      }
    : undefined;

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    overallFunnelScore: scoring.overallFunnelScore,
    creativeStrengthScore: scoring.creativeStrengthScore,
    creativeScoreBreakdown: {
      strategicScore: messagingQualityScore(scoring.watchThroughScore),
      retentionScore: scoring.retentionScore,
      retentionVerdict: scoring.retentionRationale,
    },
    conversionScore: {
      total: scoring.landingPageTotal,
      categories: scoring.landingPageCategories,
    },
    verdict: scoring.verdict,
    headline: `${VERDICT_LABEL_TEXT[scoring.verdict.label]} — ${scoring.headline}`,
    angleTags: scoring.angleTags,
    agentFindings: scoring.agentFindings,
    angleRecommendations: scoring.angleRecommendations,
    topBlockers: scoring.topFindings.slice(0, 3),
    hookVariants: scoring.hookVariants,
    scriptRewrite: sanitizeScriptRewrite(scoring.scriptRewrite),
    priorityActions: scoring.priorityActions.slice(0, 3),
    ...(scoring.icpSimulation ? { icpSimulation: scoring.icpSimulation } : {}),
    ...(marketIntelligence.brief ? { intelligenceBrief: marketIntelligence.brief } : {}),
    ...(competitiveInsights.length ? { competitiveInsights } : {}),
    flags: {
      landingPagePartial: input.landingPageStatus === "partial",
      landingPageFailed: input.landingPageStatus === "failed",
      creativeKind: visualIntelligence.kind,
      notes: flagsNotes,
    },
    ...(videoContext ? { videoContext } : {}),
    rawAgents: {
      skeptical_buyer: input.viewer.raw,
      direct_response: input.performanceExpert.raw,
      verdict: verdictText,
    },
  };
}
