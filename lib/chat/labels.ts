import { formatAnalysisDateTime } from "@/lib/analyses/utils";
import { isComparisonReport } from "@/lib/report/normalize-comparison";
import type { Analysis } from "@/lib/types/analysis";

export function getReportChatContextLabel(analysis: Analysis): string {
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
