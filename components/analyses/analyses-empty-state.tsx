"use client";

import { motion } from "framer-motion";
import { EmptyDashboardVisual } from "@/components/dashboard/empty-dashboard-visual";
import { NewAnalysisCta } from "@/components/dashboard/new-analysis-cta";

const OUTCOME_CARDS = [
  {
    title: "Track improvement",
    description: "Compare funnel scores over time and see what's working.",
  },
  {
    title: "Reference old reports",
    description: "Revisit agent findings, hooks, and action plans anytime.",
  },
  {
    title: "Compare creatives",
    description: "Line up image, video, and script analyses side by side.",
  },
];

export function AnalysesEmptyState() {
  return (
    <div className="dash-card relative mt-10 overflow-hidden p-6 md:p-10 lg:p-12">
      <div className="relative mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">
            Every funnel report,{" "}
            <span className="text-gradient-accent">in one place</span>
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/55">
            Run your first analysis to build a searchable history of scores,
            verdicts, and recommendations — so you can track progress and
            compare creatives over time.
          </p>

          <div className="mt-6">
            <NewAnalysisCta label="Run Your First Analysis" size="compact" />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {OUTCOME_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
                className="app-inset rounded-xl p-4"
              >
                <h3 className="text-sm font-semibold text-white">{card.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  {card.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="hidden justify-center sm:flex">
          <EmptyDashboardVisual />
        </div>
      </div>
    </div>
  );
}
