"use client";

import { motion } from "framer-motion";

type ChatUserMessageProps = {
  content: string;
};

export function ChatUserMessage({ content }: ChatUserMessageProps) {
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
          <p className="text-sm leading-relaxed text-text-primary">{content}</p>
        </div>
      </div>
    </motion.div>
  );
}
