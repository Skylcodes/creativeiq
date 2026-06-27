"use client";

import type { WorkspaceMetrics } from "@/lib/types/analysis";
import { MetricTile } from "@/components/ui/premium-card";
import { AnimatedNumber } from "@/components/ui/animated-number";

type StatsStripProps = {
  metrics: WorkspaceMetrics;
};

export function StatsStrip({ metrics }: StatsStripProps) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-3">
      <MetricTile
        label="Total Analyses"
        tone="orange"
        value={<AnimatedNumber value={metrics.totalAnalyses} />}
        delay={0}
        icon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M2 13L6 7L9 10L14 3"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />
      <MetricTile
        label="Avg. Funnel Score"
        tone="purple"
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <circle
              cx="8"
              cy="8"
              r="5.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M8 5V8.5L10.5 10"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        }
      />
      <MetricTile
        label="This Month"
        tone="teal"
        value={<AnimatedNumber value={metrics.analysesThisMonth} />}
        delay={0.12}
        icon={
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <rect
              x="2"
              y="3"
              width="12"
              height="11"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M2 6.5H14M5 1.5V4M11 1.5V4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    </div>
  );
}
