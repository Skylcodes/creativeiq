"use client";

import type { AnalysisListItem, WorkspaceMetrics } from "@/lib/types/analysis";
import type { Workspace } from "@/lib/types/workspace";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { FadeUp, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { InsightsStrip } from "./insights-strip";
import { NewAnalysisCta } from "./new-analysis-cta";
import { DashboardActionCards } from "./dashboard-action-cards";
import { PerformanceSnapshotWidget } from "./performance-snapshot";
import { RecentAnalyses } from "./recent-analyses";
import { StatsStrip } from "./stats-strip";
import { WorkspaceHeader } from "./workspace-header";
import type { PerformanceSnapshot } from "@/lib/performance/types";
import { TestQueueWidget } from "./test-queue-widget";

type ActiveDashboardProps = {
  workspace: Workspace;
  displayName: string;
  metrics: WorkspaceMetrics;
  recentAnalyses: AnalysisListItem[];
  performanceSnapshot: PerformanceSnapshot;
  testQueueCount: number;
};

export function ActiveDashboard({
  workspace,
  displayName,
  metrics,
  recentAnalyses,
  performanceSnapshot,
  testQueueCount,
}: ActiveDashboardProps) {
  return (
    <PageShell grid>
      <PageHeader
        eyebrow="Command Center"
        title={`Welcome back, ${displayName}`}
        description="Your creative intelligence workspace — track analyses, surface insights, and decide what to test next."
        action={<NewAnalysisCta label="New Analysis" size="compact" />}
        compact
      />

      <div className="mb-6">
        <WorkspaceHeader workspace={workspace} compact />
      </div>

      <FadeUp delay={0.05}>
        <DashboardActionCards featured />
      </FadeUp>

      <FadeUp delay={0.1} className="mt-8">
        <StatsStrip metrics={metrics} />
      </FadeUp>

      <div className="mt-10 grid gap-6 xl:grid-cols-12">
        <FadeUp delay={0.15} className="xl:col-span-8">
          <RecentAnalyses analyses={recentAnalyses} />
        </FadeUp>

        <StaggerGroup className="space-y-5 xl:col-span-4">
          <StaggerItem>
            <TestQueueWidget count={testQueueCount} />
          </StaggerItem>
          <StaggerItem>
            <PerformanceSnapshotWidget snapshot={performanceSnapshot} />
          </StaggerItem>
          <StaggerItem>
            <InsightsStrip />
          </StaggerItem>
        </StaggerGroup>
      </div>
    </PageShell>
  );
}
