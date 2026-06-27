"use client";

import type { CreativeScoreBreakdown } from "@/lib/types/report";
import {
  getReportScoreColor,
  getReportScoreLabel,
} from "@/lib/report/utils";
import { PremiumCard } from "@/components/ui/premium-card";

type CreativeScoreBreakdownCardProps = {
  breakdown: CreativeScoreBreakdown;
  blendedScore: number;
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = getReportScoreColor(score);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <span className="text-sm font-semibold" style={{ color }}>
          {score}
          <span className="font-medium text-text-muted">/100</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export function CreativeScoreBreakdownCard({
  breakdown,
  blendedScore,
}: CreativeScoreBreakdownCardProps) {
  const blendedColor = getReportScoreColor(blendedScore);

  return (
    <PremiumCard padding="md">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <ScoreBar label="Messaging quality" score={breakdown.strategicScore} />
          <ScoreBar label="Attention & retention" score={breakdown.retentionScore} />
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">
            Creative strength
          </p>
          <p
            className="mt-0.5 font-display text-3xl font-bold leading-none"
            style={{ color: blendedColor }}
          >
            {blendedScore}
            <span className="ml-1 text-base font-medium text-text-muted">/ 100</span>
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: blendedColor }}>
            {getReportScoreLabel(blendedScore)}
          </p>
        </div>
      </div>
    </PremiumCard>
  );
}
