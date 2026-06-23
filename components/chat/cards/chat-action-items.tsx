"use client";

import { motion } from "framer-motion";

type ChatActionItemsProps = {
  items: string[];
  index?: number;
};

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function ChatActionItems({ items, index = 0 }: ChatActionItemsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="premium-card rounded-xl p-1"
    >
      <div className="border-b border-[rgba(55,41,111,0.07)] px-3.5 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Recommended actions
        </p>
      </div>
      <ol className="divide-y divide-[rgba(55,41,111,0.06)]">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 px-3.5 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/8 font-display text-xs font-bold text-accent">
              {i + 1}
            </span>
            <p className="pt-0.5 text-sm leading-relaxed text-text-secondary">
              {renderInline(item)}
            </p>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}
