import "server-only";
import { ANALYSIS_PLATFORMS } from "@/lib/analyses/constants";
import {
  getCreativeGoalLabel,
  normalizeCreativeGoal,
} from "@/lib/analyses/creative-goals";
import { formatBrandProfileForPrompt } from "@/lib/ai/brand-profile-prompt";
import { getAnalysisVerdict, formatAnalysisDateTime } from "@/lib/analyses/utils";
import { isComparisonReport } from "@/lib/report/normalize-comparison";
import { normalizeReport } from "@/lib/report/normalize";
import type { Analysis } from "@/lib/types/analysis";
import type { ComparisonReport } from "@/lib/types/comparison";
import type { AnalysisReport, BrandProfile } from "@/lib/types/report";
import type { Workspace } from "@/lib/types/workspace";

function platformLabel(analysis: Analysis): string {
  const labels = analysis.platforms.map((id) => {
    if (id === "other" && analysis.platform_other) return analysis.platform_other;
    return ANALYSIS_PLATFORMS.find((p) => p.id === id)?.label ?? id;
  });
  return labels.length ? labels.join(", ") : "—";
}

function creativeBlock(analysis: Analysis, report: AnalysisReport | null): string {
  const lines: string[] = ["=== CREATIVE ASSET ==="];

  if (analysis.creative_type === "script" && analysis.script_content) {
    lines.push(`Type: Script\n\n${analysis.script_content}`);
    return lines.join("\n");
  }

  if (report?.videoContext) {
    const vc = report.videoContext;
    if (vc.primaryMessaging) lines.push(`Primary messaging:\n${vc.primaryMessaging}`);
    if (vc.onScreenText) lines.push(`On-screen text:\n${vc.onScreenText}`);
    if (vc.visualDescription) lines.push(`Visual description:\n${vc.visualDescription}`);
    if (vc.transcript) lines.push(`Transcript reference:\n${vc.transcript.slice(0, 3000)}`);
    lines.push(`Type: Video`);
    return lines.join("\n\n");
  }

  if (analysis.script_content) {
    lines.push(`Type: ${analysis.creative_type}\nScript/copy:\n${analysis.script_content}`);
  } else {
    lines.push(
      `Type: ${analysis.creative_type}`,
      analysis.creative_file_name
        ? `File: ${analysis.creative_file_name}`
        : "Visual creative — analyzed from image/video processing."
    );
  }

  return lines.join("\n");
}

function funnelReportBlock(report: AnalysisReport): string {
  return JSON.stringify(
    {
      overallFunnelScore: report.overallFunnelScore,
      creativeStrengthScore: report.creativeStrengthScore,
      creativeScoreBreakdown: report.creativeScoreBreakdown,
      conversionScore: report.conversionScore,
      headline: report.headline,
      agentFindings: report.agentFindings,
      angleRecommendations: report.angleRecommendations,
      topBlockers: report.topBlockers,
      hookVariants: report.hookVariants,
      scriptRewrite: report.scriptRewrite,
      priorityActions: report.priorityActions,
      icpSimulation: report.icpSimulation,
      rawAgents: report.rawAgents,
      intelligenceBrief: report.intelligenceBrief,
    },
    null,
    2
  );
}

function comparisonReportBlock(report: ComparisonReport): string {
  return JSON.stringify(report, null, 2);
}

export function buildAnalysisContextLabel(analysis: Analysis): string {
  const date = formatAnalysisDateTime(
    analysis.completed_at ?? analysis.created_at
  );
  const isComparison =
    analysis.analysis_mode === "comparison" || isComparisonReport(analysis.report);

  if (isComparison) {
    const variantCount = analysis.variants?.length ?? 0;
    return `Comparison · ${variantCount} variants — ${date}`;
  }

  return `${analysis.title} — ${date}`;
}

export function buildWorkspaceContextLabel(analysisCount: number): string {
  return `Full workspace — ${analysisCount} analyses`;
}

export function buildAnalysisChatContext(
  workspace: Workspace,
  analysis: Analysis
): { contextBlock: string; contextLabel: string } {
  const brandProfile = workspace.brand_profile as BrandProfile | null;
  const goal = getCreativeGoalLabel(normalizeCreativeGoal(analysis.creative_goal));
  const isComparison =
    analysis.analysis_mode === "comparison" || isComparisonReport(analysis.report);

  const reportSection = isComparison
    ? comparisonReportBlock(analysis.report as ComparisonReport)
    : funnelReportBlock(
        normalizeReport(
          analysis.report && !isComparisonReport(analysis.report)
            ? (analysis.report as AnalysisReport)
            : null
        )
      );

  const funnelReport =
    !isComparison && analysis.report
      ? normalizeReport(analysis.report as AnalysisReport)
      : null;

  const contextBlock = [
    "=== BRAND PROFILE ===",
    brandProfile
      ? formatBrandProfileForPrompt(brandProfile)
      : "(No brand profile on file.)",
    "",
    "=== ANALYSIS META ===",
    `Title: ${analysis.title}`,
    `Platform: ${platformLabel(analysis)}`,
    `Creative goal: ${goal}`,
    `Mode: ${isComparison ? "Comparison" : "Funnel analysis"}`,
    `Funnel score: ${analysis.funnel_score ?? "—"}`,
    "",
    creativeBlock(analysis, funnelReport),
    "",
    "=== FULL REPORT DATA ===",
    reportSection,
  ].join("\n");

  return {
    contextBlock,
    contextLabel: buildAnalysisContextLabel(analysis),
  };
}

export function buildWorkspaceChatContext(
  workspace: Workspace,
  recentAnalyses: Analysis[]
): { contextBlock: string; contextLabel: string } {
  const brandProfile = workspace.brand_profile as BrandProfile | null;

  const summaries = recentAnalyses.map((a) => {
    const isComparison =
      a.analysis_mode === "comparison" || isComparisonReport(a.report);
    return {
      id: a.id,
      title: a.title,
      date: a.completed_at ?? a.created_at,
      score: a.funnel_score,
      goal: getCreativeGoalLabel(normalizeCreativeGoal(a.creative_goal)),
      mode: isComparison ? "comparison" : "funnel",
      verdict: getAnalysisVerdict(a),
      platforms: platformLabel(a),
    };
  });

  const contextBlock = [
    "=== BRAND PROFILE ===",
    brandProfile
      ? formatBrandProfileForPrompt(brandProfile)
      : "(No brand profile on file.)",
    "",
    "=== RECENT WORKSPACE ANALYSES (newest first) ===",
    JSON.stringify(summaries, null, 2),
    "",
    "Use these summaries to compare performance across creatives. Reference specific scores and verdicts when the user asks about trends or prior ads.",
  ].join("\n");

  return {
    contextBlock,
    contextLabel: buildWorkspaceContextLabel(recentAnalyses.length),
  };
}
