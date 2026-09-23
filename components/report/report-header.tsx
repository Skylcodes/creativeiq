"use client";

import Link from "next/link";
import type { Analysis } from "@/lib/types/analysis";
import type { AnalysisReport } from "@/lib/types/report";
import {
  formatCreativeType,
  formatPlatforms,
  formatReportDate,
} from "@/lib/report/utils";
import { ChatOpenButton } from "@/components/chat/chat-open-button";
import { CreativeGoalBadge } from "@/components/shared/creative-goal-badge";
import { ScoreHero } from "./shared/score-hero";

type ReportHeaderProps = {
  analysis: Analysis;
  report: AnalysisReport;
  workspaceName: string;
  onOpenChat?: () => void;
  onTrackLaunch?: () => void;
  launchCount?: number;
};

export function ReportHeader({
  analysis,
  report,
  workspaceName,
  onOpenChat,
  onTrackLaunch,
  launchCount = 0,
}: ReportHeaderProps) {
  const reportDate =
    report.generatedAt || analysis.completed_at || analysis.created_at;
  const headline =
    report.headline ||
    "Analysis complete — review the sections below for strategic direction.";

  return (
    <div id="section-verdict" className="dash-card scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 md:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-[13px] font-medium text-white/55 transition-colors hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9 3L4 7L9 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          {onOpenChat && <ChatOpenButton onClick={onOpenChat} />}
          <button
            type="button"
            disabled
            title="Export coming soon"
            className="btn-ghost cursor-not-allowed text-xs opacity-50"
          >
            Export
          </button>
        </div>
      </div>

      <div className="border-b border-white/[0.08] px-4 py-6 md:px-6 md:py-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
          Strategic verdict
        </p>
        <h1 className="mt-2 font-display text-xl font-semibold leading-snug tracking-[-0.03em] text-white md:text-2xl">
          {headline}
        </h1>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <ScoreHero
            score={report.overallFunnelScore}
            label="Overall funnel score"
            size="compact"
          />
          <CreativeGoalBadge
            goal={analysis.creative_goal}
            showContext
            className="sm:max-w-xs sm:text-right"
          />
        </div>
      </div>

      <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Analysis", analysis.title],
          ["Workspace", workspaceName],
          ["Platform", formatPlatforms(analysis)],
          ["Analyzed", formatReportDate(reportDate)],
        ].map(([label, value]) => (
          <div key={label} className="bg-[#0a0714]/40 px-4 py-3 md:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {label}
            </p>
            <p className="mt-0.5 text-sm font-medium text-white/80">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-3 md:px-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Creative type
          </p>
          <p className="mt-0.5 text-sm text-white/70">
            {formatCreativeType(analysis.creative_type)}
          </p>
        </div>
        {onTrackLaunch && (
          <button
            type="button"
            onClick={onTrackLaunch}
            className="text-sm font-medium text-accent-tertiary transition-colors hover:text-accent"
          >
            Track launch
            {launchCount > 0 ? ` (${launchCount})` : ""} →
          </button>
        )}
      </div>
    </div>
  );
}
