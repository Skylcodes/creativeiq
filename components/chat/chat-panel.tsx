"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CreativeDirectorChat } from "./creative-director-chat";
import { ChatSessionsSidebar } from "./chat-sessions-sidebar";
import { useChatSessions } from "./use-chat-sessions";

type ChatPanelProps = {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  analysisId?: string | null;
  contextLabel: string;
};

export function ChatPanel({
  open,
  onClose,
  workspaceId,
  analysisId = null,
  contextLabel,
}: ChatPanelProps) {
  const {
    sessions,
    activeChatId,
    setActiveChatId,
    createSession,
    deleteSession,
    notifySessionUpdated,
  } = useChatSessions({ workspaceId, analysisId });

  async function handleNewChat() {
    try {
      await createSession();
    } catch {
      // ignore
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 modal-overlay md:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="dash-card fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-black/6 md:static md:z-auto md:h-[calc(100dvh-5rem)] md:w-[38%] md:min-w-[340px] md:max-w-[500px] md:shrink-0"
          >
            <CreativeDirectorChat
              key={`${workspaceId}-${analysisId ?? "workspace"}-${activeChatId ?? "none"}`}
              workspaceId={workspaceId}
              analysisId={analysisId}
              chatId={activeChatId}
              contextLabel={contextLabel}
              variant="panel"
              onClose={onClose}
              onNewChat={() => void handleNewChat()}
              onSessionUpdated={notifySessionUpdated}
              sessionsSlot={
                <ChatSessionsSidebar
                  compact
                  sessions={sessions}
                  activeChatId={activeChatId}
                  onSelect={setActiveChatId}
                  onNewChat={() => void handleNewChat()}
                  onDelete={(id) => void deleteSession(id)}
                />
              }
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
