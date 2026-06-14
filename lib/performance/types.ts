import type { ConversionCategoryKey } from "@/lib/types/report";

export type CategoryScoreKey =
  | "creative_strength"
  | ConversionCategoryKey;

export type CategoryTrendTag = "needs_attention" | "improving" | null;

export type PerformanceAnalysisPoint = {
  id: string;
  title: string;
  date: string;
  score: number;
  verdict: string;
  platformsLabel: string;
  primaryPlatform: string;
  isComparison: boolean;
  variantCount: number | null;
  delta: number | null;
  creativeGoalLabel: string;
  categoryScores: Partial<Record<CategoryScoreKey, number>>;
};

export type PerformanceHeadlineStats = {
  averageFunnelScore: number | null;
  bestScore: number | null;
  bestScoreTitle: string | null;
  bestScoreDate: string | null;
  mostImprovedDelta: number | null;
  mostImprovedFromTitle: string | null;
  mostImprovedToTitle: string | null;
  totalAnalyses: number;
};

export type CategorySparkline = {
  key: CategoryScoreKey;
  label: string;
  values: number[];
  recentScore: number | null;
  tag: CategoryTrendTag;
};

export type PerformanceInsight = {
  id: string;
  message: string;
  tone: "positive" | "coaching" | "neutral";
};

export type PerformanceSnapshot = {
  averageScore: number | null;
  recentScores: number[];
  insight: string | null;
  hasEnoughData: boolean;
};

export type WorkspacePerformance = {
  workspaceName: string;
  stats: PerformanceHeadlineStats;
  chartPoints: PerformanceAnalysisPoint[];
  categorySparklines: CategorySparkline[];
  timeline: PerformanceAnalysisPoint[];
  insights: PerformanceInsight[];
  snapshot: PerformanceSnapshot;
};
