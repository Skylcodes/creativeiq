"use client";

import { motion } from "framer-motion";

type ChatInsightCardProps = {
  title: string;
  body: string;
  index?: number;
};

export function ChatInsightCard({ title, body, index = 0 }: ChatInsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-accent/12 bg-linear-to-br from-accent/[0.04] to-white p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M7 1L8.5 5H13L9.5 7.5L11 12L7 9.5L3 12L4.5 7.5L1 5H5.5L7 1Z" stroke="#6e3aff" strokeWidth="1.1" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            CreativeIQ insight
          </p>
          <p className="mt-1 font-display text-sm font-semibold text-text-primary">{title}</p>
          {body && (
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{body}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
