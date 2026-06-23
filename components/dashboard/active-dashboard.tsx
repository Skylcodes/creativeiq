"use client";

import type { AnalysisListItem, WorkspaceMetrics } from "@/lib/types/analysis";
import type { Workspace } from "@/lib/types/workspace";
import { PageShell } from "@/components/ui/page-shell";
import { FadeUp, StaggerGroup, StaggerItem } from "@/components/ui/motion";
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
    <PageShell ambient={false} grid={false} className="px-4 pb-10 pt-5 md:px-7 md:pb-12 md:pt-6">
      <FadeUp>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-text-muted">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em] text-text-primary md:text-[1.75rem]">
              Welcome back, {displayName}
            </h1>
          </div>
          <WorkspaceHeader workspace={workspace} compact />
        </div>
      </FadeUp>

      <FadeUp delay={0.05} className="mt-7">
        <StatsStrip metrics={metrics} />
      </FadeUp>

      <FadeUp delay={0.08} className="mt-6">
        <DashboardActionCards />
      </FadeUp>

      <div className="mt-7 grid gap-5 xl:grid-cols-12">
        <FadeUp delay={0.12} className="xl:col-span-8">
          <RecentAnalyses analyses={recentAnalyses} />
        </FadeUp>

        <StaggerGroup className="space-y-4 xl:col-span-4">
          <StaggerItem>
            <TestQueueWidget count={testQueueCount} />
          </StaggerItem>
          <StaggerItem>
            <PerformanceSnapshotWidget snapshot={performanceSnapshot} />
          </StaggerItem>
        </StaggerGroup>
      </div>
    </PageShell>
  );
}
