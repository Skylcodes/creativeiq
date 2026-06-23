"use client";

import { useState } from "react";
import { CreativeDirectorChat } from "./creative-director-chat";
import { ChatSessionsSidebar } from "./chat-sessions-sidebar";
import { useChatSessions } from "./use-chat-sessions";
import { PageHeader } from "@/components/ui/page-shell";
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

  const {
    sessions,
    activeChatId,
    setActiveChatId,
    loading: sessionsLoading,
    createSession,
    deleteSession,
    notifySessionUpdated,
  } = useChatSessions({ workspaceId, analysisId });

  const selectedOption = analysisOptions.find((o) => o.id === selectedAnalysisId);
  const contextLabel =
    mode === "workspace"
      ? `Full workspace — ${defaultAnalysisCount} analyses`
      : selectedOption
        ? `${selectedOption.title} — ${selectedOption.date}`
        : "Select an analysis";

  async function handleNewChat() {
    try {
      await createSession();
    } catch {
      // Errors surface in chat component if needed
    }
  }

  async function handleDelete(chatId: string) {
    try {
      await deleteSession(chatId);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-black/6 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-4 md:px-8">
          <PageHeader
            eyebrow="Advara Strategist"
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
                  className="dash-card w-full cursor-pointer px-3.5 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-[#6947ff]/15"
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

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 overflow-hidden">
        <ChatSessionsSidebar
          sessions={sessions}
          activeChatId={activeChatId}
          loading={sessionsLoading}
          onSelect={setActiveChatId}
          onNewChat={() => void handleNewChat()}
          onDelete={(id) => void handleDelete(id)}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <CreativeDirectorChat
            key={`${workspaceId}-${analysisId ?? "workspace"}-${activeChatId ?? "none"}`}
            workspaceId={workspaceId}
            analysisId={analysisId}
            chatId={activeChatId}
            contextLabel={contextLabel}
            variant="page"
            onNewChat={() => void handleNewChat()}
            onSessionUpdated={notifySessionUpdated}
          />
        </div>
      </div>
    </div>
  );
}
