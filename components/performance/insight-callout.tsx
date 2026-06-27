"use client";

import { motion } from "framer-motion";
import type { PerformanceInsight } from "@/lib/performance/types";

type InsightCalloutProps = {
  insight: PerformanceInsight;
  index?: number;
};

const TONE_STYLES = {
  positive: {
    surface: "border-teal-400/20 bg-teal-400/[0.06]",
    icon: "#2dd4bf",
  },
  coaching: {
    surface: "border-accent/25 bg-accent/[0.08]",
    icon: "#a78bfa",
  },
  neutral: {
    surface: "border-white/10 bg-white/[0.04]",
    icon: "#a1a1aa",
  },
};

export function InsightCallout({ insight, index = 0 }: InsightCalloutProps) {
  const style = TONE_STYLES[insight.tone];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`flex gap-4 rounded-2xl border p-5 backdrop-blur-xl ${style.surface}`}
    >
      <div
        className="icon-badge flex h-10 w-10 shrink-0 items-center justify-center"
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
      <p className="text-sm leading-relaxed text-white/80">{insight.message}</p>
    </motion.div>
  );
}
