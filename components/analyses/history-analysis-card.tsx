"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { AnalysisListItem } from "@/lib/types/analysis";
import {
  formatAnalysisDateTime,
  getAnalysisVerdict,
} from "@/lib/analyses/utils";
import { getCreativeGoalLabel, normalizeCreativeGoal } from "@/lib/analyses/creative-goals";
import {
  getReportScoreBg,
  getReportScoreColor,
  getReportScoreLabel,
  formatPlatforms,
} from "@/lib/report/utils";

type HistoryAnalysisCardProps = {
  analysis: AnalysisListItem;
  index: number;
  onDelete: (analysis: AnalysisListItem) => void;
};

function CreativeThumbnail({ analysis }: { analysis: AnalysisListItem }) {
  const src = analysis.signedThumbnailUrl;

  if (src && analysis.creative_type !== "script") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-full w-full object-cover" />
    );
  }

  const icons = {
    video: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2.5" fill="#1a1a2e" />
        <path d="M10 9.5L15 12L10 14.5V9.5Z" fill="white" fillOpacity="0.85" />
      </svg>
    ),
    image: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2.5" fill="#ede9fe" />
        <circle cx="9" cy="10" r="2" fill="#6947ff" fillOpacity="0.45" />
        <path
          d="M3 16L9 11L13 14L21 8"
          stroke="#6947ff"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
    script: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="5" y="3" width="14" height="18" rx="2" fill="#f4f4f5" />
        <path
          d="M9 8H15M9 12H15M9 16H12"
          stroke="#71717a"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return (
    <div className="surface-inset flex h-full w-full items-center justify-center">
      {icons[analysis.creative_type]}
    </div>
  );
}

function ScoreBadge({
  score,
  label,
  prominent = false,
}: {
  score: number | null;
  label: string;
  prominent?: boolean;
}) {
  if (score === null) {
    return (
      <div className="text-center">
        <p className="text-2xl font-display font-semibold text-text-muted">—</p>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">
          {label}
        </p>
      </div>
    );
  }

  const color = getReportScoreColor(score);
  const bg = getReportScoreBg(score);

  return (
    <div className="text-center">
      <div
        className={`inline-flex flex-col items-center rounded-2xl px-3 py-2 ${prominent ? "min-w-[88px]" : "min-w-[72px]"}`}
        style={{ background: bg }}
      >
        <span
          className={`font-display font-bold tracking-tight ${prominent ? "text-3xl" : "text-xl"}`}
          style={{ color }}
        >
          {score}
        </span>
        <span className="text-[10px] font-medium text-text-muted">/100</span>
      </div>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
        {label}
      </p>
      {prominent && (
        <p className="mt-0.5 text-xs font-medium" style={{ color }}>
          {getReportScoreLabel(score)}
        </p>
      )}
    </div>
  );
}

export function HistoryAnalysisCard({
  analysis,
  index,
  onDelete,
}: HistoryAnalysisCardProps) {
  const verdict = getAnalysisVerdict(analysis);
  const platforms = formatPlatforms(analysis);
  const goalLabel = getCreativeGoalLabel(normalizeCreativeGoal(analysis.creative_goal));
  const isComparison = analysis.analysis_mode === "comparison";
  const variantCount = analysis.variants?.length ?? 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.38,
        delay: index * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group premium-card premium-card-interactive overflow-hidden"
    >
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-5 md:p-5">
        <div className="surface-inset h-20 w-20 shrink-0 overflow-hidden md:h-[88px] md:w-[88px]">
          <CreativeThumbnail analysis={analysis} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isComparison && (
              <span className="insight-chip text-[11px] font-semibold text-[#3b2b9f]">
                Comparison · {variantCount} variants
              </span>
            )}
            <span className="insight-chip text-[11px] font-semibold">
              Goal: {goalLabel}
            </span>
            <span className="insight-chip text-[11px] font-semibold text-accent">
              {platforms}
            </span>
            <span className="text-[11px] text-text-muted">
              {formatAnalysisDateTime(analysis.created_at)}
            </span>
          </div>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-secondary">
            {verdict}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4 md:gap-6">
          <ScoreBadge
            score={analysis.funnel_score}
            label={isComparison ? "Winner Score" : "Funnel Score"}
            prominent
          />
          {!isComparison && (
            <ScoreBadge
              score={analysis.conversion_score}
              label="Conversion"
            />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 md:flex-col md:items-stretch">
          <Link
            href={`/report/${analysis.id}`}
            className="btn-premium md:min-w-[132px]"
          >
            View Report
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M3 7H11M8 4L11 7L8 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <button
            type="button"
            onClick={() => onDelete(analysis)}
            className="btn-ghost h-10 w-10 md:h-auto md:w-auto md:px-3 md:py-2"
            aria-label={`Delete analysis from ${platforms}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 4.5H13M5.5 4.5V3.5C5.5 3.2 5.7 3 6 3H10C10.3 3 10.5 3.2 10.5 3.5V4.5M6.5 7V11M9.5 7V11M4.5 4.5L5 13C5 13.6 5.4 14 6 14H10C10.6 14 11 13.6 11 13L11.5 4.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden md:ml-1.5 md:inline text-xs font-medium">
              Delete
            </span>
          </button>
        </div>
      </div>
    </motion.article>
  );
}
