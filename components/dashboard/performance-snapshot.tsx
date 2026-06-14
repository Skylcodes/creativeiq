"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { NewAnalysisCta } from "@/components/dashboard/new-analysis-cta";
import { Sparkline } from "@/components/performance/sparkline";
import { PremiumCard } from "@/components/ui/premium-card";
import { getReportScoreColor } from "@/lib/report/utils";
import type { PerformanceSnapshot } from "@/lib/performance/types";
import { EASE_PREMIUM } from "@/components/ui/motion";

type PerformanceSnapshotWidgetProps = {
  snapshot: PerformanceSnapshot;
};

export function PerformanceSnapshotWidget({
  snapshot,
}: PerformanceSnapshotWidgetProps) {
  if (!snapshot.hasEnoughData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: EASE_PREMIUM }}
      >
        <PremiumCard padding="md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Performance Snapshot
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-text-secondary">
            Run 2 or more analyses to start tracking your creative performance trends.
          </p>
          <div className="mt-4">
            <NewAnalysisCta label="Run New Analysis" size="compact" />
          </div>
        </PremiumCard>
      </motion.div>
    );
  }

  const trendColor =
    snapshot.recentScores.length >= 2
      ? getReportScoreColor(snapshot.recentScores[snapshot.recentScores.length - 1])
      : "#6e3aff";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: EASE_PREMIUM }}
    >
      <PremiumCard padding="md">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              Performance Snapshot
            </p>
            {snapshot.averageScore !== null && (
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className="font-display text-3xl font-bold tracking-tight"
                  style={{ color: getReportScoreColor(snapshot.averageScore) }}
                >
                  {snapshot.averageScore}
                </span>
                <span className="text-sm text-text-muted">avg score</span>
              </div>
            )}
          </div>
          <Sparkline
            values={snapshot.recentScores}
            width={120}
            height={44}
            stroke={trendColor}
            fill={`${trendColor}15`}
          />
        </div>

        {snapshot.insight && (
          <p className="mt-4 text-[13px] leading-relaxed text-text-secondary">
            {snapshot.insight}
          </p>
        )}

        <Link
          href="/performance"
          className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:text-accent-hover"
        >
          View full performance
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </PremiumCard>
    </motion.div>
  );
}
