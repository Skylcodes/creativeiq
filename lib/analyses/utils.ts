import type { Analysis } from "@/lib/types/analysis";
import type { ComparisonReport } from "@/lib/types/comparison";
import type { AnalysisReport } from "@/lib/types/report";
import { isComparisonReport } from "@/lib/report/normalize-comparison";

export function getAnalysisVerdict(analysis: Analysis): string {
  const report = analysis.report;

  if (analysis.analysis_mode === "comparison" || isComparisonReport(report)) {
    const comparison = report as ComparisonReport | null;
    if (comparison?.winnerVerdict?.trim()) return comparison.winnerVerdict.trim();
    return "Open the comparison report to see which variant won.";
  }

  const funnelReport = report as AnalysisReport | null;
  if (!funnelReport) {
    return "Open the full report for agent findings and recommendations.";
  }

  const headline = funnelReport.headline?.trim();
  if (headline) return headline;

  const verdict = funnelReport.rawAgents?.verdict?.trim();
  if (!verdict) {
    return "Open the full report for agent findings and recommendations.";
  }

  const sentence = verdict.match(/^[^.!?\n]+[.!?]?/)?.[0]?.trim();
  if (sentence && sentence.length <= 220) return sentence;
  return `${verdict.slice(0, 217).trim()}…`;
}

export function formatAnalysisDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAnalysisDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function getScoreColor(score: number | null): string {
  if (score === null) return "text-text-muted";
  if (score >= 80) return "text-accent-secondary";
  if (score >= 60) return "text-amber-600";
  return "text-red-500";
}

export function getScoreRingColor(score: number | null): string {
  if (score === null) return "#e4e4e7";
  if (score >= 80) return "#0d9488";
  if (score >= 60) return "#d97706";
  return "#ef4444";
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
