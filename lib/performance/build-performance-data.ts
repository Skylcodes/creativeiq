import type {
  CategorySparkline,
  CategoryTrendTag,
  PerformanceAnalysisPoint,
  PerformanceHeadlineStats,
  PerformanceInsight,
  PerformanceSnapshot,
  WorkspacePerformance,
} from "./types";
import {
  CATEGORY_DEFINITIONS,
  analysisToPerformancePoint,
} from "./extract-scores";
import type { Analysis } from "@/lib/types/analysis";
import { ANALYSIS_PLATFORMS } from "@/lib/analyses/constants";

function attachDeltas(chronological: PerformanceAnalysisPoint[]): PerformanceAnalysisPoint[] {
  return chronological.map((point, i) => ({
    ...point,
    delta: i === 0 ? null : point.score - chronological[i - 1].score,
  }));
}

function computeHeadlineStats(
  chronological: PerformanceAnalysisPoint[]
): PerformanceHeadlineStats {
  const total = chronological.length;
  if (total === 0) {
    return {
      averageFunnelScore: null,
      bestScore: null,
      bestScoreTitle: null,
      bestScoreDate: null,
      mostImprovedDelta: null,
      mostImprovedFromTitle: null,
      mostImprovedToTitle: null,
      totalAnalyses: 0,
    };
  }

  const scores = chronological.map((p) => p.score);
  const averageFunnelScore = Math.round(
    scores.reduce((a, b) => a + b, 0) / scores.length
  );

  let best = chronological[0];
  for (const p of chronological) {
    if (p.score > best.score) best = p;
  }

  let mostImprovedDelta: number | null = null;
  let mostImprovedFromTitle: string | null = null;
  let mostImprovedToTitle: string | null = null;

  for (let i = 1; i < chronological.length; i++) {
    const delta = chronological[i].score - chronological[i - 1].score;
    if (mostImprovedDelta === null || delta > mostImprovedDelta) {
      mostImprovedDelta = delta;
      mostImprovedFromTitle = chronological[i - 1].title;
      mostImprovedToTitle = chronological[i].title;
    }
  }

  return {
    averageFunnelScore,
    bestScore: best.score,
    bestScoreTitle: best.title,
    bestScoreDate: best.date,
    mostImprovedDelta: mostImprovedDelta !== null && mostImprovedDelta > 0 ? mostImprovedDelta : null,
    mostImprovedFromTitle,
    mostImprovedToTitle,
    totalAnalyses: total,
  };
}

function computeCategoryTag(values: number[]): CategoryTrendTag {
  if (values.length < 3) return null;

  const last3 = values.slice(-3);
  const allLow = last3.every((v) => v < 60);
  if (allLow) return "needs_attention";

  const improving =
    last3[2] > last3[1] && last3[1] > last3[0] && last3[2] - last3[0] >= 5;
  if (improving) return "improving";

  return null;
}

function buildCategorySparklines(
  chronological: PerformanceAnalysisPoint[]
): CategorySparkline[] {
  const last8 = chronological.slice(-8);

  return CATEGORY_DEFINITIONS.map(({ key, label }) => {
    const values = last8
      .map((p) => p.categoryScores[key])
      .filter((v): v is number => v !== undefined && v !== null);

    return {
      key,
      label,
      values,
      recentScore: values.length > 0 ? values[values.length - 1] : null,
      tag: computeCategoryTag(values),
    };
  });
}

function platformName(id: string): string {
  return ANALYSIS_PLATFORMS.find((p) => p.id === id)?.label ?? id;
}

export function generateInsights(
  chronological: PerformanceAnalysisPoint[],
  stats: PerformanceHeadlineStats
): PerformanceInsight[] {
  const insights: PerformanceInsight[] = [];

  if (chronological.length < 2) return insights;

  // Platform comparison
  const byPlatform = new Map<string, number[]>();
  for (const p of chronological) {
    const arr = byPlatform.get(p.primaryPlatform) ?? [];
    arr.push(p.score);
    byPlatform.set(p.primaryPlatform, arr);
  }

  const platformAvgs = [...byPlatform.entries()]
    .filter(([, scores]) => scores.length >= 1)
    .map(([platform, scores]) => ({
      platform,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  if (platformAvgs.length >= 2 && platformAvgs[0].avg - platformAvgs[1].avg >= 5) {
    insights.push({
      id: "platform-gap",
      tone: "coaching",
      message: `Your ${platformName(platformAvgs[0].platform)} analyses consistently score higher than your ${platformName(platformAvgs[1].platform)} analyses. Your creative style may be more native to ${platformName(platformAvgs[0].platform)}.`,
    });
  }

  // Weakest category streak (last 3 funnel analyses with LP data)
  const funnelPoints = chronological.filter(
    (p) => !p.isComparison && Object.keys(p.categoryScores).length > 1
  );
  if (funnelPoints.length >= 3) {
    const last3 = funnelPoints.slice(-3);
    const categoryAvgs = CATEGORY_DEFINITIONS.filter((c) => c.key !== "creative_strength")
      .map(({ key, label }) => {
        const vals = last3
          .map((p) => p.categoryScores[key])
          .filter((v): v is number => v != null);
        if (vals.length < 2) return null;
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        return { key, label, avg };
      })
      .filter(Boolean) as { key: string; label: string; avg: number }[];

    const workspaceAvg = stats.averageFunnelScore ?? 65;
    const weak = categoryAvgs
      .filter((c) => c.avg < Math.min(60, workspaceAvg - 5))
      .sort((a, b) => a.avg - b.avg)[0];

    if (weak) {
      insights.push({
        id: "weak-category",
        tone: "coaching",
        message: `Your last 3 analyses all scored below average on ${weak.label}. This is your most consistent weak point — prioritize improvements in this area next.`,
      });
    }
  }

  // Trend over last 5
  const last5 = chronological.slice(-5);
  if (last5.length >= 3) {
    const firstHalf = last5.slice(0, Math.floor(last5.length / 2));
    const secondHalf = last5.slice(Math.floor(last5.length / 2));
    const avgFirst =
      firstHalf.reduce((s, p) => s + p.score, 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((s, p) => s + p.score, 0) / secondHalf.length;
    const diff = Math.round(avgSecond - avgFirst);

    if (diff >= 5) {
      insights.push({
        id: "trend-up",
        tone: "positive",
        message: `Your scores are trending up +${diff} pts over your last ${last5.length} analyses. Keep implementing what is working.`,
      });
    } else if (diff <= -5) {
      insights.push({
        id: "trend-down",
        tone: "coaching",
        message: `Your scores dipped ${Math.abs(diff)} pts over your last ${last5.length} analyses. Review your recent reports for recurring blockers.`,
      });
    }
  }

  // 30-day average improvement
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recent = chronological.filter((p) => new Date(p.date).getTime() >= thirtyDaysAgo);
  const older = chronological.filter((p) => new Date(p.date).getTime() < thirtyDaysAgo);

  if (recent.length >= 2 && older.length >= 1) {
    const recentAvg =
      recent.reduce((s, p) => s + p.score, 0) / recent.length;
    const olderAvg =
      older.reduce((s, p) => s + p.score, 0) / older.length;
    const gain = Math.round(recentAvg - olderAvg);

    if (gain >= 8 && !insights.some((i) => i.id === "trend-up")) {
      insights.push({
        id: "30-day-gain",
        tone: "positive",
        message: `You improved your average score by ${gain} points over the last 30 days. Your optimizations are working.`,
      });
    }
  }

  return insights.slice(0, 3);
}

function buildSnapshot(chronological: PerformanceAnalysisPoint[]): PerformanceSnapshot {
  const hasEnoughData = chronological.length >= 2;
  const recentScores = chronological.slice(-5).map((p) => p.score);
  const averageScore =
    chronological.length > 0
      ? Math.round(
          chronological.reduce((s, p) => s + p.score, 0) / chronological.length
        )
      : null;

  let insight: string | null = null;

  if (hasEnoughData && recentScores.length >= 2) {
    const diff = recentScores[recentScores.length - 1] - recentScores[0];
    if (diff >= 3) {
      insight = `Your scores are trending up +${diff} pts over your last ${recentScores.length} analyses`;
    } else if (diff <= -3) {
      insight = `Your scores dipped ${Math.abs(diff)} pts over your last ${recentScores.length} analyses`;
    } else {
      const sparklines = buildCategorySparklines(chronological);
      const needsAttention = sparklines.find((s) => s.tag === "needs_attention");
      if (needsAttention) {
        insight = `${needsAttention.label} has been your lowest category ${needsAttention.values.length} analyses in a row`;
      }
    }
  }

  return { averageScore, recentScores, insight, hasEnoughData };
}

export function buildWorkspacePerformance(
  workspaceName: string,
  analyses: Analysis[]
): WorkspacePerformance {
  const chronological = analyses
    .map(analysisToPerformancePoint)
    .filter((p): p is PerformanceAnalysisPoint => p !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const withDeltas = attachDeltas(chronological);
  const stats = computeHeadlineStats(withDeltas);
  const categorySparklines = buildCategorySparklines(withDeltas);
  const insights = generateInsights(withDeltas, stats);
  const snapshot = buildSnapshot(withDeltas);

  return {
    workspaceName,
    stats,
    chartPoints: withDeltas,
    categorySparklines,
    timeline: [...withDeltas].reverse(),
    insights,
    snapshot,
  };
}
