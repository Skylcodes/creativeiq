"use client";

import { motion } from "framer-motion";
import { INPUT_PLACEHOLDERS, QUICK_ACTION_CHIPS } from "@/lib/chat/constants";

type ChatInputAreaProps = {
  input: string;
  placeholderIndex: number;
  disabled: boolean;
  showQuickActions: boolean;
  onInputChange: (value: string) => void;
  onSend: (text?: string) => void;
};

export function ChatInputArea({
  input,
  placeholderIndex,
  disabled,
  showQuickActions,
  onInputChange,
  onSend,
}: ChatInputAreaProps) {
  return (
    <div className="premium-card-glass shrink-0 border-t border-white/65 px-4 py-4 md:px-5">
      {showQuickActions && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex flex-wrap gap-2"
        >
          {QUICK_ACTION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onSend(chip)}
              className="insight-chip"
            >
              {chip}
            </button>
          ))}
        </motion.div>
      )}

      <div className="premium-card premium-card-glass rounded-[22px] p-2 shadow-soft focus-within:border-accent/[0.22] focus-within:ring-4 focus-within:ring-accent/[0.12]">
        <textarea
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={INPUT_PLACEHOLDERS[placeholderIndex]}
          rows={2}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-60"
        />
        <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
          <p className="text-[10px] text-text-muted">
            <kbd className="surface-inset px-1 py-0.5 font-mono text-[9px]">
              ↵
            </kbd>{" "}
            to send
          </p>
          <button
            type="button"
            onClick={() => onSend()}
            disabled={disabled || !input.trim()}
            className="dash-btn-primary px-3.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            Send
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <path
                d="M2 6H10M7 3L10 6L7 9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
