import "server-only";

import { runFunnelGrading } from "@/lib/ai/funnel-grading";
import {
  buildFunnelAnalysisReport,
  deriveComparisonFeedbackFromReport,
} from "@/lib/ai/build-funnel-analysis-report";
import type { RawCriteria } from "@/lib/ai/criteria";
import type { CreativeGoal } from "@/lib/analyses/creative-goals";
import { normalizeCreativeGoal } from "@/lib/analyses/creative-goals";
import type { ImageInput } from "@/lib/ai/client";
import type { ComparisonTestDimension } from "@/lib/types/comparison";
import type { AnalysisReport, IntelligenceBrief } from "@/lib/types/report";
import type { VideoCreativeContext } from "@/lib/ai/video";

export type CreativeEvaluation = {
  /** Matches analysis `funnel_score` / report `overallFunnelScore`. */
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
  rawAgents: {
    direct_response: string;
    skeptical_buyer: string;
  };
};

export type EvaluateCreativeInput = {
  brandProfileText: string;
  creativeText: string;
  creativeIsImage: boolean;
  creativeIsVideo?: boolean;
  creativeGoal?: CreativeGoal;
  landingPageText: string;
  landingPageStatus: "ok" | "partial" | "failed";
  lpError?: string;
  platformText: string;
  intelligenceBriefText?: string;
  intelligenceBrief?: IntelligenceBrief | null;
  criteriaList?: RawCriteria[];
  image?: ImageInput;
  visionImage?: ImageInput;
  variantLabel: string;
  testDimensions: ComparisonTestDimension[];
  creativeKind?: AnalysisReport["flags"]["creativeKind"];
  videoContext?: VideoCreativeContext;
  brandProfilePartial?: boolean;
};

export type EvaluateCreativeOptions = {
  criteriaText?: string;
};

/**
 * Grades a comparison variant through the exact same funnel path as standalone analysis.
 */
export async function evaluateCreative(
  input: EvaluateCreativeInput,
  options: EvaluateCreativeOptions = {}
): Promise<CreativeEvaluation> {
  const creativeGoal = normalizeCreativeGoal(input.creativeGoal);
  const creativeKind =
    input.creativeKind ??
    (input.creativeIsImage
      ? "image"
      : input.creativeIsVideo
        ? "video"
        : "script");

  const { report: reportRaw, buyer, drCritic, drRewriteSeed } =
    await runFunnelGrading({
      brandProfileText: input.brandProfileText,
      creativeText: input.creativeText,
      creativeIsImage: input.creativeIsImage,
      creativeIsVideo: input.creativeIsVideo ?? false,
      creativeGoal,
      landingPageText: input.landingPageText,
      landingPageStatus: input.landingPageStatus,
      platformText: input.platformText,
      intelligenceBriefText: input.intelligenceBriefText,
      criteriaText: options.criteriaText,
      visionImage: input.visionImage ?? input.image,
      geminiVisualContext: input.videoContext?.geminiVisualContext,
    });

  const analysisReport = await buildFunnelAnalysisReport({
    reportRaw,
    buyer,
    drCritic,
    drRewriteSeed,
    brandProfileText: input.brandProfileText,
    creativeText: input.creativeText,
    platformText: input.platformText,
    landingPageStatus: input.landingPageStatus,
    lpError: input.lpError,
    creativeKind,
    criteriaList: input.criteriaList,
    intelligenceBrief: input.intelligenceBrief,
    brandProfilePartial: input.brandProfilePartial,
    videoContext: input.videoContext
      ? {
          transcript: input.videoContext.transcript,
          primaryMessaging: input.videoContext.primaryMessaging,
          backgroundAudioNote: input.videoContext.backgroundAudioNote,
          onScreenText: input.videoContext.onScreenText,
          transcriptAvailable: input.videoContext.transcriptAvailable,
          visualDescription: input.videoContext.visualDescription,
          visualTimeline: input.videoContext.visualTimeline,
          frameCount: input.videoContext.frameCount,
          analyzedDurationSec: input.videoContext.analyzedDurationSec,
          videoDurationSec: input.videoContext.videoDurationSec,
          visualAnalysisMode: input.videoContext.visualAnalysisMode,
          processingNotes: input.videoContext.processingNotes,
        }
      : undefined,
  });

  const feedback = deriveComparisonFeedbackFromReport(analysisReport);

  const scoreBreakdown: Record<string, number> = {};
  for (const dimension of input.testDimensions) {
    scoreBreakdown[dimension] = analysisReport.creativeStrengthScore;
  }

  return {
    score: analysisReport.overallFunnelScore,
    creativeStrengthScore: analysisReport.creativeStrengthScore,
    conversionScore: analysisReport.conversionScore.total,
    scoreBreakdown,
    ...feedback,
    analysisReport,
    rawAgents: {
      direct_response: drCritic,
      skeptical_buyer: buyer,
    },
  };
}
