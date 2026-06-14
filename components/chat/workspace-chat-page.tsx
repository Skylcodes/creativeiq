"use client";

import { useState } from "react";
import { CreativeDirectorChat } from "./creative-director-chat";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import type { ChatAnalysisOption } from "@/lib/types/chat";

type WorkspaceChatPageProps = {
  workspaceId: string;
  analysisOptions: ChatAnalysisOption[];
  defaultAnalysisCount: number;
};

export function WorkspaceChatPage({
  workspaceId,
  analysisOptions,
  defaultAnalysisCount,
}: WorkspaceChatPageProps) {
  const [mode, setMode] = useState<"workspace" | "analysis">("workspace");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>("");

  const analysisId = mode === "analysis" && selectedAnalysisId ? selectedAnalysisId : null;

  const selectedOption = analysisOptions.find((o) => o.id === selectedAnalysisId);
  const contextLabel =
    mode === "workspace"
      ? `Full workspace — ${defaultAnalysisCount} analyses`
      : selectedOption
        ? `${selectedOption.title} — ${selectedOption.date}`
        : "Select an analysis";

  return (
    <PageShell ambient={false} className="flex h-[calc(100dvh-5rem)] min-h-0 flex-col p-0">
      <div className="shrink-0 border-b border-black/[0.06] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-5 py-5 md:px-8">
          <PageHeader
            eyebrow="CreativeIQ Strategist"
            title="Creative Director"
            description="Open-ended strategic conversations across your creative portfolio."
            compact
            action={
              <div className="w-full md:w-auto md:min-w-[280px]">
                <label
                  htmlFor="chat-context"
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted"
                >
                  Analysis context
                </label>
                <select
                  id="chat-context"
                  value={mode === "workspace" ? "workspace" : selectedAnalysisId}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "workspace") {
                      setMode("workspace");
                      setSelectedAnalysisId("");
                    } else {
                      setMode("analysis");
                      setSelectedAnalysisId(value);
                    }
                  }}
                  className="premium-card w-full cursor-pointer px-3.5 py-2.5 text-sm text-text-primary outline-none transition-shadow focus:ring-2 focus:ring-accent/10"
                >
                  <option value="workspace">Full workspace context</option>
                  {analysisOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                      {option.score != null ? ` · ${option.score}/100` : ""}
                      {option.isComparison ? " · Comparison" : ""}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
        </div>
      </div>

      <div className="mx-auto min-h-0 w-full max-w-4xl flex-1">
        <CreativeDirectorChat
          key={`${workspaceId}-${analysisId ?? "workspace"}`}
          workspaceId={workspaceId}
          analysisId={analysisId}
          contextLabel={contextLabel}
          variant="page"
        />
      </div>
    </PageShell>
  );
}
