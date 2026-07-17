"use client";

import { useState } from "react";
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
import { ReportTabs } from "./report-tabs";
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
      : null,
  );
  const [libraryHooks, setLibraryHooks] = useState(savedHooks);
  const hookLookup = buildHookLookup(libraryHooks);
  const { chatOpen, setChatOpen } = useReportChat();
  const contextLabel = getReportChatContextLabel(analysis);

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

  return (
    <ReportChatLayout
      workspaceId={analysis.workspace_id}
      analysisId={analysis.id}
      contextLabel={contextLabel}
      chatOpen={chatOpen}
      onChatOpenChange={setChatOpen}
    >
      <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-4 md:px-8 md:pb-20">
        <div className="relative">
          <ReportHeader
            analysis={analysis}
            report={report}
            workspaceName={workspaceName}
            onOpenChat={() => setChatOpen(true)}
          />
          <LaunchTracker analysis={analysis} launches={launches} />
          <ReportTabs
            report={report}
            hookLookup={hookLookup}
            hookSaveBase={hookSaveBase}
            onHookSaved={handleHookSaved}
          />
        </div>
      </div>
    </ReportChatLayout>
  );
}
