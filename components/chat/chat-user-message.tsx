"use client";

import { motion } from "framer-motion";
import { CollapsibleMessageBody } from "./collapsible-message-body";

type ChatUserMessageProps = {
  content: string;
  defaultExpanded?: boolean;
};

export function ChatUserMessage({
  content,
  defaultExpanded = true,
}: ChatUserMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-end"
    >
      <div className="max-w-[88%]">
        <p className="mb-1.5 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Your question
        </p>
        <div className="chat-bubble-user rounded-2xl rounded-br-md px-4 py-3">
          <CollapsibleMessageBody
            contentLength={content.length}
            defaultExpanded={defaultExpanded}
            fadeClassName="from-[#f3f0ff] via-[#f3f0ff]/90"
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
              {content}
            </p>
          </CollapsibleMessageBody>
        </div>
      </div>
    </motion.div>
  );
}
