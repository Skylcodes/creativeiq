import type { Analysis } from "@/lib/types/analysis";
import type { ComparisonReport } from "@/lib/types/comparison";
import { createTextPdf, slugifyFilename } from "@/lib/export/pdf";
import { formatPlatforms, formatReportDate } from "@/lib/report/utils";

export function comparisonToPlainText(
  analysis: Analysis,
  report: ComparisonReport,
  workspaceName: string
): string {
  const winner =
    report.rankings.find((r) => r.variantId === report.winnerVariantId) ??
    report.rankings[0];

  const lines: string[] = [
    "ADVARA VARIANT COMPARISON",
    "=========================",
    "",
    analysis.title,
    `Workspace: ${workspaceName}`,
    `Platform: ${formatPlatforms(analysis)}`,
    `Test dimensions: ${report.testDimensions.join(", ")}`,
    `Analyzed: ${formatReportDate(report.generatedAt || analysis.completed_at || analysis.created_at)}`,
    "",
    "WINNER",
    winner
      ? `${winner.label} (rank ${winner.rank}, score ${winner.score}/100)`
      : report.winnerVariantId,
    report.winnerVerdict,
    report.noneStrongEnough ? "Note: none of the variants were strong enough to scale as-is." : "",
    "",
    "RANKINGS",
    ...report.rankings.map(
      (r) => `#${r.rank} ${r.label} — ${r.score}/100\n   ${r.reason}`
    ),
    "",
    "KEY INSIGHTS",
    `Deciding factor: ${report.keyInsights.decidingFactor}`,
    `Pattern: ${report.keyInsights.pattern}`,
    `Next test: ${report.keyInsights.nextTest}`,
    "",
    "STRUCTURAL DIFFERENCES",
    report.structuralDifferences || "—",
  ];

  if (report.recommendedHybrid) {
    lines.push(
      "",
      "RECOMMENDED HYBRID",
      report.recommendedHybrid.script,
      `Production: ${report.recommendedHybrid.productionNote}`
    );
  }

  for (const detail of report.variantDetails) {
    lines.push(
      "",
      `VARIANT: ${detail.label} (${detail.score}/100)`,
      "Strengths:",
      ...detail.strengths.map((s) => `• ${s}`),
      "Weaknesses:",
      ...detail.weaknesses.map((w) => `• ${w}`)
    );
    if (detail.improvements) {
      lines.push("Improvements:", detail.improvements);
    }
    if (detail.analysisReport?.headline) {
      lines.push(`Headline: ${detail.analysisReport.headline}`);
    }
    if (detail.analysisReport?.priorityActions?.length) {
      lines.push("Priority actions:");
      for (const action of detail.analysisReport.priorityActions.slice(0, 5)) {
        lines.push(`• ${action.action}`);
      }
    }
  }

  if (report.competitiveInsights?.length) {
    lines.push("", "COMPETITIVE INSIGHTS");
    for (const insight of report.competitiveInsights) {
      lines.push(`• ${insight}`);
    }
  }

  return lines.filter(Boolean).join("\n");
}

export async function downloadComparisonPdf(
  analysis: Analysis,
  report: ComparisonReport,
  workspaceName: string,
  filename?: string
): Promise<void> {
  const pdf = await createTextPdf();
  const name =
    filename ??
    `advara-comparison-${slugifyFilename(analysis.title, analysis.id.slice(0, 8))}.pdf`;

  const winner =
    report.rankings.find((r) => r.variantId === report.winnerVariantId) ??
    report.rankings[0];

  pdf.addHeading("Advara Variant Comparison", 18);
  pdf.addBody(analysis.title, 12);
  pdf.addBody(
    `${workspaceName} · ${formatPlatforms(analysis)} · ${report.testDimensions.join(", ")}`
  );
  pdf.addBody(
    `Analyzed ${formatReportDate(report.generatedAt || analysis.completed_at || analysis.created_at)}`
  );
  pdf.addSpacer();

  pdf.addHeading("Winner");
  pdf.addBody(
    winner
      ? `${winner.label} — ${winner.score}/100 (rank ${winner.rank})`
      : report.winnerVariantId
  );
  pdf.addBody(report.winnerVerdict);
  if (report.noneStrongEnough) {
    pdf.addBody("None of the variants were strong enough to scale as-is.");
  }

  pdf.addHeading("Rankings");
  for (const r of report.rankings) {
    pdf.addBody(`#${r.rank} ${r.label} — ${r.score}/100\n${r.reason}`);
  }

  pdf.addHeading("Key Insights");
  pdf.addBody(
    `Deciding factor: ${report.keyInsights.decidingFactor}\nPattern: ${report.keyInsights.pattern}\nNext test: ${report.keyInsights.nextTest}`
  );

  pdf.addHeading("Structural Differences");
  pdf.addBody(report.structuralDifferences || "—");

  if (report.recommendedHybrid) {
    pdf.addHeading("Recommended Hybrid");
    pdf.addBody(report.recommendedHybrid.script);
    pdf.addBody(`Production: ${report.recommendedHybrid.productionNote}`);
  }

  for (const detail of report.variantDetails) {
    pdf.addHeading(`Variant: ${detail.label} (${detail.score}/100)`);
    if (detail.strengths.length) {
      pdf.addBody(`Strengths:\n${detail.strengths.map((s) => `• ${s}`).join("\n")}`);
    }
    if (detail.weaknesses.length) {
      pdf.addBody(
        `Weaknesses:\n${detail.weaknesses.map((w) => `• ${w}`).join("\n")}`
      );
    }
    if (detail.improvements) {
      pdf.addBody(`Improvements:\n${detail.improvements}`);
    }
    if (detail.analysisReport?.headline) {
      pdf.addBody(`Headline: ${detail.analysisReport.headline}`);
    }
  }

  pdf.save(name);
}
