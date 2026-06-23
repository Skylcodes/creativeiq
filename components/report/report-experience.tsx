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
import { ReportHeader } from "./report-header";
import { ReportTabs } from "./report-tabs";
import type { HookSaveContext } from "@/components/hooks/hook-row-actions";

type ReportExperienceProps = {
  analysis: Analysis;
  workspaceName: string;
  savedHooks?: HookLibraryEntry[];
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
      <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-4 md:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
          <div className="absolute inset-0 ambient-bg opacity-25" />
          <div className="absolute inset-0 grid-pattern opacity-20" />
        </div>

        <div className="relative">
          <ReportHeader
            analysis={analysis}
            report={report}
            workspaceName={workspaceName}
            onOpenChat={() => setChatOpen(true)}
          />
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
