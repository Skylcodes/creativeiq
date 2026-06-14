"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CreativeDirectorChat } from "./creative-director-chat";

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
  analysisId,
  contextLabel,
}: ChatPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-black/[0.05] bg-[#f8f8f7]/95 shadow-[-20px_0_60px_rgba(110,58,255,0.08)] backdrop-blur-xl md:static md:z-auto md:h-[calc(100dvh-5rem)] md:w-[38%] md:min-w-[340px] md:max-w-[500px] md:shrink-0"
          >
            <CreativeDirectorChat
              key={`${workspaceId}-${analysisId ?? "workspace"}`}
              workspaceId={workspaceId}
              analysisId={analysisId}
              contextLabel={contextLabel}
              variant="panel"
              onClose={onClose}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
