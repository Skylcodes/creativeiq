"use client";

import type { ReactNode } from "react";
import { ChatPanel } from "./chat-panel";

type ReportChatLayoutProps = {
  children: ReactNode;
  workspaceId: string;
  analysisId: string;
  contextLabel: string;
  chatOpen: boolean;
  onChatOpenChange: (open: boolean) => void;
};

export function ReportChatLayout({
  children,
  workspaceId,
  analysisId,
  contextLabel,
  chatOpen,
  onChatOpenChange,
}: ReportChatLayoutProps) {
  return (
    <div className="flex min-h-0 w-full">
      <div
        className={`min-w-0 transition-all duration-300 ease-out ${
          chatOpen ? "w-full md:w-[62%] md:shrink-0" : "w-full"
        }`}
      >
        {children}
      </div>
      <ChatPanel
        open={chatOpen}
        onClose={() => onChatOpenChange(false)}
        workspaceId={workspaceId}
        analysisId={analysisId}
        contextLabel={contextLabel}
      />
    </div>
  );
}
