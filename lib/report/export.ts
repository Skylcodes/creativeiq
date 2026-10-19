import type { Analysis } from "@/lib/types/analysis";
import type { AnalysisReport } from "@/lib/types/report";
import { createTextPdf, slugifyFilename } from "@/lib/export/pdf";
import {
  formatCreativeType,
  formatPlatforms,
  formatReportDate,
} from "@/lib/report/utils";

export function reportToPlainText(
  analysis: Analysis,
  report: AnalysisReport,
  workspaceName: string
): string {
  const lines: string[] = [
    "ADVARA FUNNEL ANALYSIS",
    "======================",
    "",
    analysis.title,
    `Workspace: ${workspaceName}`,
    `Platform: ${formatPlatforms(analysis)}`,
    `Creative: ${formatCreativeType(analysis.creative_type)}`,
    `Analyzed: ${formatReportDate(report.generatedAt || analysis.completed_at || analysis.created_at)}`,
    "",
    `Overall funnel score: ${report.overallFunnelScore}/100`,
    `Creative strength: ${report.creativeStrengthScore}/100`,
    `Conversion: ${report.conversionScore.total}/100`,
  ];

  if (report.verdict) {
    lines.push("", `Verdict: ${report.verdict.label}`, report.verdict.rationale);
  }

  lines.push("", "HEADLINE", report.headline || "—");

  if (report.priorityActions?.length) {
    lines.push("", "PRIORITY ACTIONS");
    for (const [i, action] of report.priorityActions.entries()) {
      lines.push(
        `${i + 1}. [${action.impact}/${action.effort}] ${action.action}`,
        action.strategicFix ? `   Fix: ${action.strategicFix}` : "",
        action.whyItMatters ? `   Why: ${action.whyItMatters}` : ""
      );
    }
  }

  if (report.topBlockers?.length) {
    lines.push("", "TOP BLOCKERS");
    for (const blocker of report.topBlockers) {
      lines.push(
        `• [${blocker.severity}] ${blocker.title}`,
        `  ${blocker.detail}`
      );
    }
  }

  if (report.hookVariants?.length) {
    lines.push("", "HOOK REWRITES");
    for (const hook of report.hookVariants) {
      lines.push(
        `#${hook.rank} (${hook.predictedPerformance}) — ${hook.hook}`,
        `   ${hook.rationale}`
      );
    }
  }

  if (report.scriptRewrite?.trim()) {
    lines.push("", "SCRIPT REWRITE", report.scriptRewrite.trim());
  }

  if (report.conversionScore.categories?.length) {
    lines.push("", "FUNNEL CHECK");
    for (const cat of report.conversionScore.categories) {
      lines.push(
        `${cat.label}: ${cat.score}/${cat.maxScore}`,
        `  ${cat.verdict}`,
        cat.improvement ? `  Improve: ${cat.improvement}` : ""
      );
    }
  }

  if (report.angleRecommendations?.length) {
    lines.push("", "WHAT TO TEST NEXT");
    for (const angle of report.angleRecommendations) {
      lines.push(
        `#${angle.rank} ${angle.angle}`,
        `  ${angle.rationale || angle.whyItWorks || ""}`
      );
    }
  }

  if (report.competitiveInsights?.length) {
    lines.push("", "COMPETITIVE INSIGHTS");
    for (const insight of report.competitiveInsights) {
      lines.push(`• ${insight}`);
    }
  }

  return lines.filter((line) => line !== undefined).join("\n");
}

export async function downloadReportPdf(
  analysis: Analysis,
  report: AnalysisReport,
  workspaceName: string,
  filename?: string
): Promise<void> {
  const pdf = await createTextPdf();
  const name =
    filename ??
    `advara-report-${slugifyFilename(analysis.title, analysis.id.slice(0, 8))}.pdf`;

  pdf.addHeading("Advara Funnel Analysis", 18);
  pdf.addBody(analysis.title, 12);
  pdf.addBody(
    `${workspaceName} · ${formatPlatforms(analysis)} · ${formatCreativeType(analysis.creative_type)}`
  );
  pdf.addBody(
    `Analyzed ${formatReportDate(report.generatedAt || analysis.completed_at || analysis.created_at)}`
  );
  pdf.addSpacer();

  pdf.addHeading("Scores");
  pdf.addBody(
    `Overall funnel: ${report.overallFunnelScore}/100\nCreative strength: ${report.creativeStrengthScore}/100\nConversion: ${report.conversionScore.total}/100`
  );

  if (report.verdict) {
    pdf.addHeading("Verdict");
    pdf.addBody(`${report.verdict.label}\n${report.verdict.rationale}`);
  }

  pdf.addHeading("Headline");
  pdf.addBody(report.headline || "—");

  if (report.priorityActions?.length) {
    pdf.addHeading("Priority Actions");
    for (const [i, action] of report.priorityActions.entries()) {
      pdf.addBody(
        `${i + 1}. ${action.action} (impact: ${action.impact}, effort: ${action.effort})`
      );
      if (action.strategicFix) pdf.addBody(`Fix: ${action.strategicFix}`);
    }
  }

  if (report.topBlockers?.length) {
    pdf.addHeading("Top Blockers");
    for (const blocker of report.topBlockers) {
      pdf.addBody(`[${blocker.severity}] ${blocker.title}\n${blocker.detail}`);
    }
  }

  if (report.hookVariants?.length) {
    pdf.addHeading("Hook Rewrites");
    for (const hook of report.hookVariants) {
      pdf.addBody(`#${hook.rank} — ${hook.hook}\n${hook.rationale}`);
    }
  }

  if (report.scriptRewrite?.trim()) {
    pdf.addHeading("Script Rewrite");
    pdf.addBody(report.scriptRewrite.trim());
  }

  if (report.conversionScore.categories?.length) {
    pdf.addHeading("Funnel Check");
    for (const cat of report.conversionScore.categories) {
      pdf.addBody(
        `${cat.label}: ${cat.score}/${cat.maxScore}\n${cat.verdict}${cat.improvement ? `\nImprove: ${cat.improvement}` : ""}`
      );
    }
  }

  if (report.angleRecommendations?.length) {
    pdf.addHeading("What To Test Next");
    for (const angle of report.angleRecommendations) {
      pdf.addBody(
        `#${angle.rank} ${angle.angle}\n${angle.rationale || angle.whyItWorks || ""}`
      );
    }
  }

  pdf.save(name);
}
