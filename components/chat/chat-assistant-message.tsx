"use client";

import { motion } from "framer-motion";
import { ChatMessageContent } from "./chat-message-content";
import { CollapsibleMessageBody } from "./collapsible-message-body";

type ChatAssistantMessageProps = {
  content: string;
  contextLabel: string;
  animate?: boolean;
  isStreaming?: boolean;
  streamText?: string;
  defaultExpanded?: boolean;
};

export function ChatAssistantMessage({
  content,
  contextLabel,
  animate = true,
  isStreaming = false,
  streamText,
  defaultExpanded = true,
}: ChatAssistantMessageProps) {
  const displayContent = isStreaming && streamText ? streamText : content;
  const showCursor = isStreaming && streamText;

  return (
    <motion.article
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className="icon-badge flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.1]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
          >
            <path
              d="M7 1L8.5 5H13L9.5 7.5L11 12L7 9.5L3 12L4.5 7.5L1 5H5.5L7 1Z"
              stroke="#6947ff"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            Creative Director
          </p>
          <p className="truncate text-[11px] text-white/45">
            Based on {contextLabel}
          </p>
        </div>
      </div>

      <div className="chat-bubble-assistant rounded-2xl p-4 md:p-5">
        {isStreaming && !streamText ? (
          <ChatThinkingIndicator />
        ) : showCursor ? (
          <div className="text-sm leading-[1.7] text-white/75">
            <p className="whitespace-pre-wrap">
              {displayContent}
              <span className="ml-0.5 inline-block h-[1.05em] w-0.5 animate-pulse bg-accent/60 align-text-bottom" />
            </p>
          </div>
        ) : (
          <CollapsibleMessageBody
            contentLength={displayContent.length}
            defaultExpanded={defaultExpanded}
            disabled={isStreaming}
          >
            <ChatMessageContent content={displayContent} animate={animate} />
          </CollapsibleMessageBody>
        )}
      </div>
    </motion.article>
  );
}

function ChatThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-accent/50"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="text-xs text-white/45">
        Analyzing your creative context…
      </span>
    </div>
  );
}
