"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import { FadeUp } from "@/components/ui/motion";
import type { WorkspacePerformance } from "@/lib/performance/types";
import type { LaunchWithOutcomes } from "@/lib/types/outcome";
import { BreakdownTrends } from "./breakdown-trends";
import { InsightCallout } from "./insight-callout";
import { LaunchOutcomesSection } from "./launch-outcomes-section";
import { PerformanceEmptyState } from "./performance-empty-state";
import { PerformanceStatsStrip } from "./performance-stats-strip";
import { PerformanceTimeline } from "./performance-timeline";
import { ScoreTrendChart } from "./score-trend-chart";

type PerformanceViewProps = {
  data: WorkspacePerformance;
  workspaceId: string;
  launches?: LaunchWithOutcomes[];
  analysisMeta?: Record<string, { title: string; creativeGoal?: string }>;
};

export function PerformanceView({
  data,
  workspaceId,
  launches = [],
  analysisMeta = {},
}: PerformanceViewProps) {
  const router = useRouter();
  const { activeWorkspace, switching } = useWorkspace();

  useEffect(() => {
    if (!activeWorkspace || activeWorkspace.id === workspaceId) return;
    router.replace("/performance");
    router.refresh();
  }, [activeWorkspace, workspaceId, router]);

  const hasEnoughData = data.stats.totalAnalyses >= 2;

  return (
    <PageShell
      className={
        hasEnoughData
          ? `transition-opacity ${switching ? "opacity-60" : "opacity-100"}`
          : undefined
      }
    >
      <PageHeader
        title="Creative Performance"
        description={
          hasEnoughData
            ? `Track score trends and creative evolution for ${data.workspaceName}`
            : data.workspaceName
        }
      />

      {hasEnoughData ? (
        <div className="space-y-10">
          <FadeUp delay={0.05}>
            <PerformanceStatsStrip stats={data.stats} />
          </FadeUp>

          {data.insights.length > 0 && (
            <FadeUp delay={0.1} className="space-y-3">
              {data.insights.map((insight, i) => (
                <InsightCallout key={insight.id} insight={insight} index={i} />
              ))}
            </FadeUp>
          )}

          <FadeUp delay={0.15}>
            <PremiumCard variant="elevated" padding="lg" className="dash-card">
              <h2 className="font-display text-lg font-semibold text-white">
                Score Trend
              </h2>
              <p className="mt-1 text-[13px] text-white/55">
                Every analysis score over time — hover for details
              </p>
              <div className="relative mt-8">
                <ScoreTrendChart
                  points={data.chartPoints}
                  averageScore={data.stats.averageFunnelScore}
                />
              </div>
            </PremiumCard>
          </FadeUp>

          <FadeUp delay={0.2}>
            <BreakdownTrends sparklines={data.categorySparklines} />
          </FadeUp>

          {data.insights[1] && (
            <InsightCallout insight={data.insights[1]} index={0} />
          )}

          <FadeUp delay={0.25}>
            <PerformanceTimeline items={data.timeline} />
          </FadeUp>

          {data.insights[2] && (
            <InsightCallout insight={data.insights[2]} index={0} />
          )}
        </div>
      ) : (
        <PerformanceEmptyState />
      )}

      <LaunchOutcomesSection
        workspaceId={workspaceId}
        launches={launches}
        analysisMeta={analysisMeta}
      />
    </PageShell>
  );
}
