import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runFullAnalysis } from "@/lib/ai/pipeline";
import type { MarketIntelligenceResult } from "@/lib/ai/pipeline-types";
import type { Analysis } from "@/lib/types/analysis";
import type { AnalysisReport } from "@/lib/types/report";
import type { Workspace } from "@/lib/types/workspace";

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

/** Derive comparison-view synthesis bullets from a full analysis report. */
function deriveComparisonFeedbackFromReport(report: AnalysisReport): {
  strengths: string[];
  weaknesses: string[];
  improvements: string | null;
  productionNote: string | null;
  summary: string;
} {
  const strengths = report.agentFindings
    .flatMap((finding) => finding.keyFindings ?? [])
    .filter(Boolean)
    .slice(0, 3);

  const weaknesses = (report.topBlockers ?? [])
    .slice(0, 3)
    .map((blocker) => (blocker.title ? `${blocker.title}: ${blocker.detail}` : blocker.detail))
    .filter(Boolean);

  const showRewrite = report.creativeStrengthScore < 75;
  const scriptBody = report.scriptRewrite.replace(/\n*Production note:[\s\S]*$/i, "").trim();
  const productionMatch = report.scriptRewrite.match(/\n*Production note:\s*([\s\S]+)$/i);

  return {
    strengths,
    weaknesses,
    improvements: showRewrite && scriptBody.length > 20 ? scriptBody : null,
    productionNote: showRewrite && productionMatch?.[1] ? productionMatch[1].trim() : null,
    summary: report.headline?.trim() || report.rawAgents?.verdict?.trim().slice(0, 280) || "",
  };
}

export type EvaluateCreativeOptions = {
  testDimensions?: string[];
};

/**
 * Runs the full Job 1-5 analysis pipeline for a single comparison variant —
 * the exact same measurement system as standalone analysis, sharing the one
 * market-intelligence brief already gathered for the comparison run.
 */
export async function evaluateCreative(
  supabase: SupabaseClient,
  variantAnalysisRow: Analysis,
  workspace: Workspace,
  marketIntelligence: MarketIntelligenceResult,
  options: EvaluateCreativeOptions = {}
): Promise<CreativeEvaluation> {
  const { report } = await runFullAnalysis(supabase, variantAnalysisRow, workspace, {
    marketIntelligence,
  });

  const feedback = deriveComparisonFeedbackFromReport(report);

  const scoreBreakdown: Record<string, number> = {};
  for (const dimension of options.testDimensions ?? []) {
    scoreBreakdown[dimension] = report.creativeStrengthScore;
  }

  return {
    score: report.overallFunnelScore,
    creativeStrengthScore: report.creativeStrengthScore,
    conversionScore: report.conversionScore.total,
    scoreBreakdown,
    ...feedback,
    analysisReport: report,
    rawAgents: {
      direct_response: report.rawAgents?.direct_response ?? "",
      skeptical_buyer: report.rawAgents?.skeptical_buyer ?? "",
    },
  };
}
