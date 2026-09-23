"use client";

import { useMemo, useState } from "react";
import type { Analysis } from "@/lib/types/analysis";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { normalizeReport } from "@/lib/report/normalize";
import { isComparisonReport } from "@/lib/report/normalize-comparison";
import { buildHookLookup, hookTextKey } from "@/lib/hooks/utils";
import { getReportChatContextLabel } from "@/lib/chat/labels";
import { ReportChatLayout } from "@/components/chat/report-chat-layout";
import { useReportChat } from "@/components/chat/use-report-chat";
import { LaunchTracker } from "@/components/outcomes/launch-tracker";
import { ReportHeader } from "./report-header";
import { ReportNav, buildReportNavSections } from "./report-nav";
import { TopPrioritySection } from "./sections/top-priority";
import { CreativeAnalysisSection } from "./sections/creative-analysis";
import { FunnelCheckSection } from "./sections/funnel-check";
import { WhatToTestSection } from "./sections/what-to-test";
import { ActionPlanSection } from "./sections/action-plan";
import type { HookSaveContext } from "@/components/hooks/hook-row-actions";
import type { LaunchWithOutcomes } from "@/lib/types/outcome";

type ReportExperienceProps = {
  analysis: Analysis;
  workspaceName: string;
  savedHooks?: HookLibraryEntry[];
  launches?: LaunchWithOutcomes[];
};

function resolveAnalysisPlatform(analysis: Analysis): string | null {
  const p = analysis.platforms?.[0];
  if (!p || p === "other") return analysis.platform_other ?? null;
  return p;
}

export function ReportExperience({
  analysis,
  workspaceName,
  savedHooks = [],
  launches = [],
}: ReportExperienceProps) {
  const report = normalizeReport(
    analysis.report && !isComparisonReport(analysis.report)
      ? analysis.report
      : null
  );
  const [libraryHooks, setLibraryHooks] = useState(savedHooks);
  const [launchOpen, setLaunchOpen] = useState(false);
  const hookLookup = buildHookLookup(libraryHooks);
  const { chatOpen, setChatOpen } = useReportChat();
  const contextLabel = getReportChatContextLabel(analysis);
  const navSections = useMemo(
    () => (report ? buildReportNavSections(report) : []),
    [report]
  );

  const originalScript =
    analysis.script_content?.trim() ||
    report?.videoContext?.transcript?.trim() ||
    null;

  const hookSaveBase: HookSaveContext | undefined = report
    ? {
        workspaceId: analysis.workspace_id,
        sourceKind: "analysis",
        sourceAnalysisId: analysis.id,
        platform: resolveAnalysisPlatform(analysis),
        sourceScore: report.overallFunnelScore ?? analysis.funnel_score,
      }
    : undefined;

  function handleHookSaved(hook: HookLibraryEntry) {
    setLibraryHooks((prev) => {
      const key = hookTextKey(hook.hook_text);
      if (prev.some((h) => hookTextKey(h.hook_text) === key)) return prev;
      return [...prev, hook];
    });
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-white/60">
        Report data is unavailable for this analysis.
      </div>
    );
  }

  return (
    <ReportChatLayout
      workspaceId={analysis.workspace_id}
      analysisId={analysis.id}
      contextLabel={contextLabel}
      chatOpen={chatOpen}
      onChatOpenChange={setChatOpen}
    >
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-4 md:px-8 md:pb-20">
        <div className="lg:flex lg:items-start lg:gap-8">
          <ReportNav sections={navSections} />

          <div className="min-w-0 flex-1 space-y-10 md:space-y-12">
            <ReportHeader
              analysis={analysis}
              report={report}
              workspaceName={workspaceName}
              onOpenChat={() => setChatOpen(true)}
              onTrackLaunch={() => setLaunchOpen(true)}
              launchCount={launches.length}
            />

            <TopPrioritySection report={report} />

            <CreativeAnalysisSection
              report={report}
              originalScript={originalScript}
              hookLookup={hookLookup}
              hookSaveBase={hookSaveBase}
              onHookSaved={handleHookSaved}
            />

            <FunnelCheckSection report={report} />

            <WhatToTestSection report={report} />

            <ActionPlanSection report={report} />
          </div>
        </div>
      </div>

      <LaunchTracker
        analysis={analysis}
        launches={launches}
        variant="panel"
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
      />
    </ReportChatLayout>
  );
}
