import type { ComparisonReport } from "@/lib/types/comparison";

export function isComparisonReport(
  report: unknown
): report is ComparisonReport {
  return (
    typeof report === "object" &&
    report !== null &&
    (report as ComparisonReport).schemaVersion === 2
  );
}

export function normalizeComparisonReport(
  report: ComparisonReport | null | undefined
): ComparisonReport | null {
  if (!report || report.schemaVersion !== 2) return null;
  return report;
}

export function getWinnerFromReport(report: ComparisonReport) {
  return report.rankings.find((r) => r.rank === 1) ?? report.rankings[0];
}
