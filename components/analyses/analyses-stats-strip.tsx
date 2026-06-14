"use client";

import type { AnalysesHistoryMetrics } from "@/lib/types/analysis";
import { MetricTile } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";

type AnalysesStatsStripProps = {
  metrics: AnalysesHistoryMetrics;
};

export function AnalysesStatsStrip({ metrics }: AnalysesStatsStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <MetricTile
        label="Total Analyses"
        value={<AnimatedNumber value={metrics.totalAnalyses} />}
        delay={0}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M2 13L6 7L9 10L14 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
      />
      <MetricTile
        label="Avg. Funnel Score"
        value={
          metrics.averageFunnelScore !== null ? (
            <AnimatedNumber value={metrics.averageFunnelScore} />
          ) : (
            "—"
          )
        }
        suffix={metrics.averageFunnelScore !== null ? "/100" : undefined}
        delay={0.06}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 5V8.5L10.5 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        }
      />
      <MetricTile
        label="Highest Score"
        value={
          metrics.highestFunnelScore !== null ? (
            <AnimatedNumber value={metrics.highestFunnelScore} />
          ) : (
            "—"
          )
        }
        suffix={metrics.highestFunnelScore !== null ? "/100" : undefined}
        delay={0.12}
        icon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M8 2L10 6H14L11 9L12 14L8 11.5L4 14L5 9L2 6H6L8 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        }
      />
    </div>
  );
}
