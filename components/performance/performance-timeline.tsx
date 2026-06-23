"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatAnalysisDateTime } from "@/lib/analyses/utils";
import { getReportScoreColor, getReportScoreBg } from "@/lib/report/utils";
import type { PerformanceAnalysisPoint } from "@/lib/performance/types";

type PerformanceTimelineProps = {
  items: PerformanceAnalysisPoint[];
};

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-text-muted">
        <span className="text-base leading-none">—</span>
        First
      </span>
    );
  }

  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488]">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M6 2V10M3 5L6 2L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        +{delta} pts
      </span>
    );
  }

  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#ef4444]">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M6 10V2M3 7L6 10L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {delta} pts
      </span>
    );
  }

  return (
    <span className="text-xs font-medium text-text-muted">No change</span>
  );
}

export function PerformanceTimeline({ items }: PerformanceTimelineProps) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-text-primary">
        Analyses Timeline
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Your creative journey — most recent first
      </p>

      <div className="mt-6 space-y-3">
        {items.map((item, index) => {
          const color = getReportScoreColor(item.score);
          const bg = getReportScoreBg(item.score);

          return (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.35 }}
              className="premium-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {item.isComparison && (
                    <span className="insight-chip text-[10px] font-semibold text-[#3b2b9f]">
                      Comparison · {item.variantCount} variants
                    </span>
                  )}
                  <span className="insight-chip text-[10px] font-semibold">
                    Goal: {item.creativeGoalLabel}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {formatAnalysisDateTime(item.date)}
                  </span>
                </div>
                <p className="mt-1.5 truncate font-medium text-text-primary">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">{item.platformsLabel}</p>
              </div>

              <div className="flex shrink-0 items-center gap-5">
                <DeltaBadge delta={item.delta} />
                <div
                  className="flex min-w-[64px] flex-col items-center rounded-xl px-3 py-2"
                  style={{ background: bg }}
                >
                  <span
                    className="font-display text-2xl font-bold"
                    style={{ color }}
                  >
                    {item.score}
                  </span>
                  <span className="text-[10px] text-text-muted">/100</span>
                </div>
                <Link
                  href={`/report/${item.id}`}
                  className="btn-premium shrink-0"
                >
                  View Report
                </Link>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
