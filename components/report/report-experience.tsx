"use client";

import type { Analysis } from "@/lib/types/analysis";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { normalizeReport } from "@/lib/report/normalize";
import { isComparisonReport } from "@/lib/report/normalize-comparison";
import { buildHookLookup } from "@/lib/hooks/utils";
import { getReportChatContextLabel } from "@/lib/chat/labels";
import { ReportChatLayout } from "@/components/chat/report-chat-layout";
import { useReportChat } from "@/components/chat/use-report-chat";
import { ReportHeader } from "./report-header";
import { ReportTabs } from "./report-tabs";

type ReportExperienceProps = {
  analysis: Analysis;
  workspaceName: string;
  savedHooks?: HookLibraryEntry[];
};

export function ReportExperience({
  analysis,
  workspaceName,
  savedHooks = [],
}: ReportExperienceProps) {
  const report = normalizeReport(
    analysis.report && !isComparisonReport(analysis.report)
      ? analysis.report
      : null
  );
  const hookLookup = buildHookLookup(savedHooks);
  const { chatOpen, setChatOpen } = useReportChat();
  const contextLabel = getReportChatContextLabel(analysis);

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
          <div className="absolute inset-0 mesh-gradient opacity-50" />
          <div className="absolute inset-0 grid-pattern opacity-20" />
        </div>

        <div className="relative">
          <ReportHeader
            analysis={analysis}
            report={report}
            workspaceName={workspaceName}
            onOpenChat={() => setChatOpen(true)}
          />
          <ReportTabs report={report} hookLookup={hookLookup} />
        </div>
      </div>
    </ReportChatLayout>
  );
}
