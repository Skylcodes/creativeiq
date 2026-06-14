"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type CopyButtonProps = {
  text: string;
  label?: string;
  className?: string;
};

export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
        copied
          ? "bg-accent-secondary/10 text-accent-secondary ring-1 ring-accent-secondary/20"
          : "bg-white text-text-secondary shadow-sm ring-1 ring-black/[0.06] hover:text-accent"
      } ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="copied"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Copied
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3 8V2.5H8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
