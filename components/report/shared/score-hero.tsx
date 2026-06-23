"use client";

import { motion } from "framer-motion";
import {
  getReportScoreBg,
  getReportScoreColor,
  getReportScoreLabel,
} from "@/lib/report/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";

type ScoreHeroProps = {
  score: number;
  label: string;
  size?: "lg" | "md";
};

export function ScoreHero({ score, label, size = "lg" }: ScoreHeroProps) {
  const color = getReportScoreColor(score);
  const bg = getReportScoreBg(score);
  const isLarge = size === "lg";

  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`relative flex items-center justify-center rounded-3xl ${isLarge ? "h-40 w-40" : "h-28 w-28"}`}
        style={{ background: bg }}
      >
        <div className="text-center">
          <motion.span
            className={`block font-display font-bold tracking-tight ${isLarge ? "text-5xl" : "text-3xl"}`}
            style={{ color }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <AnimatedNumber value={score} duration={1.4} />
          </motion.span>
          <span className="text-xs font-medium text-text-muted">/ 100</span>
        </div>
      </motion.div>
      <p className="mt-4 text-center text-eyebrow">{label}</p>
      <p className="mt-1 text-sm font-semibold" style={{ color }}>
        {getReportScoreLabel(score)}
      </p>
    </div>
  );
}
