"use client";

import { motion } from "framer-motion";
import { formatAnalysisDate } from "@/lib/analyses/utils";
import type { PerformanceHeadlineStats } from "@/lib/performance/types";
import { getReportScoreColor } from "@/lib/report/utils";
import { PremiumCard } from "@/components/ui/premium-card";
import { EASE_PREMIUM } from "@/components/ui/motion";

type PerformanceStatsStripProps = {
  stats: PerformanceHeadlineStats;
};

function StatCard({
  label,
  value,
  sub,
  accent,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE_PREMIUM }}
    >
      <PremiumCard padding="md" className="dash-card !border-white/10 !bg-white/[0.04] p-5 md:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/40">
          {label}
        </p>
        <p
          className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-white"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </p>
        {sub && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/55">
            {sub}
          </p>
        )}
      </PremiumCard>
    </motion.div>
  );
}

export function PerformanceStatsStrip({ stats }: PerformanceStatsStripProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Average Funnel Score"
        value={stats.averageFunnelScore !== null ? String(stats.averageFunnelScore) : "—"}
        sub={
          stats.averageFunnelScore !== null
            ? "Across all analyses in this workspace"
            : undefined
        }
        accent={
          stats.averageFunnelScore !== null
            ? getReportScoreColor(stats.averageFunnelScore)
            : undefined
        }
        delay={0}
      />
      <StatCard
        label="Best Score Ever"
        value={stats.bestScore !== null ? String(stats.bestScore) : "—"}
        sub={
          stats.bestScoreTitle
            ? `${stats.bestScoreTitle} · ${formatAnalysisDate(stats.bestScoreDate!)}`
            : undefined
        }
        accent={
          stats.bestScore !== null ? getReportScoreColor(stats.bestScore) : undefined
        }
        delay={0.05}
      />
      <StatCard
        label="Most Improved"
        value={
          stats.mostImprovedDelta !== null
            ? `+${stats.mostImprovedDelta} pts`
            : "—"
        }
        sub={
          stats.mostImprovedDelta !== null
            ? `From "${stats.mostImprovedFromTitle}" to "${stats.mostImprovedToTitle}"`
            : "Run more analyses to track improvement"
        }
        accent={stats.mostImprovedDelta !== null ? "#0d9488" : undefined}
        delay={0.1}
      />
      <StatCard
        label="Total Analyses Run"
        value={String(stats.totalAnalyses)}
        sub="Every run adds to your performance history"
        delay={0.15}
      />
    </div>
  );
}
