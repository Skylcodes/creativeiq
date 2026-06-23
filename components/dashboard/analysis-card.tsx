"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { AnalysisListItem } from "@/lib/types/analysis";
import {
  getCreativeGoalLabel,
  normalizeCreativeGoal,
} from "@/lib/analyses/creative-goals";
import {
  formatAnalysisDate,
  getScoreColor,
  getScoreRingColor,
} from "@/lib/analyses/utils";
import { EASE_PREMIUM } from "@/components/ui/motion";

type AnalysisCardProps = {
  analysis: AnalysisListItem;
  index?: number;
  variant?: "card" | "list";
};

function CreativeThumbnail({ analysis }: { analysis: AnalysisListItem }) {
  const src = analysis.signedThumbnailUrl;

  if (src && analysis.creative_type !== "script") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
      />
    );
  }

  const icons = {
    video: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2" y="4" width="16" height="12" rx="2" fill="#4c3d8f" />
        <path d="M8 8L13 10L8 12V8Z" fill="white" fillOpacity="0.85" />
      </svg>
    ),
    image: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="2" y="4" width="16" height="12" rx="2" fill="#ebe8f6" />
        <circle cx="7" cy="8" r="1.5" fill="#6947ff" fillOpacity="0.55" />
        <path d="M2 13L7 9L11 12L18 7" stroke="#6947ff" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
    script: (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <rect x="4" y="2" width="12" height="16" rx="1.5" fill="#f0f1f6" />
        <path d="M7 6H13M7 9H13M7 12H10" stroke="#71717a" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f6f7fb]">
      {icons[analysis.creative_type]}
    </div>
  );
}

export function AnalysisCard({
  analysis,
  index = 0,
  variant = "card",
}: AnalysisCardProps) {
  const score = analysis.funnel_score;
  const ringColor = getScoreRingColor(score);
  const goalLabel = getCreativeGoalLabel(
    normalizeCreativeGoal(analysis.creative_goal),
  );

  if (variant === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.06, ease: EASE_PREMIUM }}
      >
        <Link
          href={`/report/${analysis.id}`}
          className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#fafbfc] md:px-6"
        >
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-black/6 bg-white">
            <CreativeThumbnail analysis={analysis} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-text-primary">
              {analysis.title}
            </h3>
            <p className="mt-0.5 text-[12px] text-text-muted">
              {formatAnalysisDate(analysis.created_at)} · {goalLabel}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <p
                className="font-display text-lg font-semibold leading-none"
                style={{ color: ringColor }}
              >
                {score ?? "—"}
              </p>
              <p className={`mt-0.5 text-[10px] font-medium ${getScoreColor(score)}`}>
                Score
              </p>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 14 14"
              fill="none"
              className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
              aria-hidden
            >
              <path
                d="M3 7H11M8 4L11 7L8 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: EASE_PREMIUM }}
      className="group"
    >
      <div className="dash-card dash-card-interactive overflow-hidden">
        <div className="flex items-start gap-4 p-4 md:p-5">
          <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-black/6">
            <CreativeThumbnail analysis={analysis} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-sm font-semibold tracking-[-0.02em] text-text-primary">
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

        <div className="border-t border-black/5 px-4 pb-4 pt-3 md:px-5">
          <Link
            href={`/report/${analysis.id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#f6f7fb] py-2.5 text-[13px] font-semibold text-text-primary transition-all duration-200 group-hover:bg-[#6947ff]/10 group-hover:text-[#4c3d8f]"
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
        </div>
      </div>
    </motion.div>
  );
}
