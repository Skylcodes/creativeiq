"use client";

import { motion } from "framer-motion";
import type { PerformanceInsight } from "@/lib/performance/types";

type InsightCalloutProps = {
  insight: PerformanceInsight;
  index?: number;
};

const TONE_STYLES = {
  positive: {
    ring: "ring-[#0d9488]/15",
    bg: "from-[#0d9488]/8 to-white",
    icon: "#0d9488",
  },
  coaching: {
    ring: "ring-accent/15",
    bg: "from-accent/8 to-white",
    icon: "#6e3aff",
  },
  neutral: {
    ring: "ring-black/[0.06]",
    bg: "from-black/[0.02] to-white",
    icon: "#71717a",
  },
};

export function InsightCallout({ insight, index = 0 }: InsightCalloutProps) {
  const style = TONE_STYLES[insight.tone];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`flex gap-4 rounded-2xl bg-linear-to-br ${style.bg} p-5 ring-1 ${style.ring}`}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm"
        style={{ color: style.icon }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path
            d="M9 2L11 7L16 8L12 12L13 17L9 14L5 17L6 12L2 8L7 7L9 2Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm leading-relaxed text-text-primary">{insight.message}</p>
    </motion.div>
  );
}
