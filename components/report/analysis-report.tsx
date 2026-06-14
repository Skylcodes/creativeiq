"use client";

import type { Analysis } from "@/lib/types/analysis";
import type { HookLibraryEntry } from "@/lib/types/hook";
import { ReportExperience } from "./report-experience";

type AnalysisReportViewProps = {
  analysis: Analysis;
  workspaceName?: string;
  savedHooks?: HookLibraryEntry[];
};

export function AnalysisReportView({
  analysis,
  workspaceName = "Workspace",
  savedHooks = [],
}: AnalysisReportViewProps) {
  return (
    <ReportExperience
      analysis={analysis}
      workspaceName={workspaceName}
      savedHooks={savedHooks}
    />
  );
}
