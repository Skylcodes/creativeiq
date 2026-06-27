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
    <PageShell ambient grid>
      <FadeUp>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="app-eyebrow">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-tertiary opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-tertiary" />
              </span>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold tracking-[-0.045em] text-white md:text-[2rem]">
              Welcome back,{" "}
              <span className="text-gradient-accent">{displayName}</span>
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
