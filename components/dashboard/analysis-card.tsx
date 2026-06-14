"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { AnalysisListItem } from "@/lib/types/analysis";
import { getCreativeGoalLabel, normalizeCreativeGoal } from "@/lib/analyses/creative-goals";
import {
  formatAnalysisDate,
  getScoreColor,
  getScoreRingColor,
} from "@/lib/analyses/utils";
import { EASE_PREMIUM } from "@/components/ui/motion";

type AnalysisCardProps = {
  analysis: AnalysisListItem;
  index?: number;
};

function CreativeThumbnail({ analysis }: { analysis: AnalysisListItem }) {
  const src = analysis.signedThumbnailUrl;

  if (src && analysis.creative_type !== "script") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    );
  }

  const icons = {
    video: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2" y="4" width="16" height="12" rx="2" fill="#1a1a2e" />
        <path d="M8 8L13 10L8 12V8Z" fill="white" fillOpacity="0.8" />
      </svg>
    ),
    image: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2" y="4" width="16" height="12" rx="2" fill="#ede9fe" />
        <circle cx="7" cy="8" r="1.5" fill="#6e3aff" fillOpacity="0.5" />
        <path d="M2 13L7 9L11 12L18 7" stroke="#6e3aff" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
    script: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="4" y="2" width="12" height="16" rx="1.5" fill="#f4f4f5" />
        <path d="M7 6H13M7 9H13M7 12H10" stroke="#71717a" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-black/[0.03]">
      {icons[analysis.creative_type]}
    </div>
  );
}

export function AnalysisCard({ analysis, index = 0 }: AnalysisCardProps) {
  const score = analysis.funnel_score;
  const ringColor = getScoreRingColor(score);
  const goalLabel = getCreativeGoalLabel(normalizeCreativeGoal(analysis.creative_goal));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: EASE_PREMIUM }}
      className="group"
    >
      <div className="premium-card premium-card-interactive overflow-hidden">
        <div className="flex items-start gap-4 p-4 md:p-5">
          <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl ring-1 ring-black/[0.04]">
            <CreativeThumbnail analysis={analysis} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-sm font-semibold leading-relaxed text-text-primary">
              {analysis.title}
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              {formatAnalysisDate(analysis.created_at)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-text-secondary">
              {goalLabel}
            </p>

            <div className="mt-3 flex items-center gap-2.5">
              <div
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold"
                style={{
                  background: `${ringColor}14`,
                  color: ringColor,
                  boxShadow: `0 0 16px ${ringColor}18`,
                }}
              >
                {score ?? "—"}
              </div>
              <span className={`text-xs font-medium ${getScoreColor(score)}`}>
                Funnel Score{score !== null ? "/100" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-black/[0.04] px-4 pb-4 pt-3 md:px-5">
          <Link
            href={`/report/${analysis.id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-black/[0.02] py-2.5 text-[13px] font-medium text-text-primary transition-all duration-200 group-hover:bg-accent/8 group-hover:text-accent"
          >
            View Report
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M3 7H11M8 4L11 7L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
