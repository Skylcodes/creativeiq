"use client";

import { motion } from "framer-motion";
import { Sparkline } from "./sparkline";
import { getReportScoreColor } from "@/lib/report/utils";
import type { CategorySparkline } from "@/lib/performance/types";

type BreakdownTrendsProps = {
  sparklines: CategorySparkline[];
};

function Tag({ type }: { type: "needs_attention" | "improving" }) {
  if (type === "needs_attention") {
    return (
      <span className="insight-chip text-[10px] font-semibold text-amber-700">
        Needs attention
      </span>
    );
  }
  return (
    <span className="insight-chip text-[10px] font-semibold text-[#0d9488]">
      Improving
    </span>
  );
}

export function BreakdownTrends({ sparklines }: BreakdownTrendsProps) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-text-primary">
        Score Breakdown Trends
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        How each scoring category has trended across your last analyses
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sparklines.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.4 }}
            className="dashboard-panel p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-text-secondary">{s.label}</p>
              {s.tag && <Tag type={s.tag} />}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                {s.recentScore !== null ? (
                  <span
                    className="font-display text-xl font-bold"
                    style={{ color: getReportScoreColor(s.recentScore) }}
                  >
                    {s.recentScore}
                  </span>
                ) : (
                  <span className="font-display text-xl font-bold text-text-muted">
                    —
                  </span>
                )}
                <span className="ml-0.5 text-[10px] text-text-muted">/100</span>
              </div>
              <Sparkline
                values={s.values}
                width={100}
                height={32}
                stroke={
                  s.recentScore !== null
                    ? getReportScoreColor(s.recentScore)
                    : "#a1a1aa"
                }
                fill={
                  s.recentScore !== null
                    ? `${getReportScoreColor(s.recentScore)}18`
                    : undefined
                }
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
