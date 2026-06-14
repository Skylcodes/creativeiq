"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Analysis } from "@/lib/types/analysis";
import type { AnalysisReport } from "@/lib/types/report";
import {
  filterReportFlagNotes,
  formatCreativeType,
  formatPlatforms,
  formatReportDate,
} from "@/lib/report/utils";
import { ChatOpenButton } from "@/components/chat/chat-open-button";
import { CreativeGoalBadge } from "@/components/shared/creative-goal-badge";
import { ScoreHero } from "./shared/score-hero";
import { FadeUp } from "@/components/ui/motion";

type ReportHeaderProps = {
  analysis: Analysis;
  report: AnalysisReport;
  workspaceName: string;
  onOpenChat?: () => void;
};

export function ReportHeader({
  analysis,
  report,
  workspaceName,
  onOpenChat,
}: ReportHeaderProps) {
  const reportDate = report.generatedAt || analysis.completed_at || analysis.created_at;
  const displayNotes = filterReportFlagNotes(report.flags.notes);

  return (
    <div className="premium-card premium-card-elevated noise-overlay overflow-hidden rounded-3xl p-0">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/[0.07] blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-accent-secondary/[0.06] blur-3xl" />
      </div>

      <div className="relative border-b border-black/[0.04] px-5 py-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M9 3L4 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dashboard
          </Link>
          <div className="flex items-center gap-2">
            {onOpenChat && <ChatOpenButton onClick={onOpenChat} />}
            <button
              type="button"
              disabled
              title="Export coming soon"
              className="btn-ghost cursor-not-allowed opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path d="M7 2V9M7 9L4.5 6.5M7 9L9.5 6.5M2 11H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="relative grid gap-8 px-5 py-8 md:grid-cols-[1fr_auto] md:px-8 md:py-10">
        <FadeUp>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Funnel Intelligence Report
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-text-primary md:text-[2rem]">
            {analysis.title}
          </h1>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {[
              ["Workspace", workspaceName],
              ["Platform", formatPlatforms(analysis)],
              ["Creative", formatCreativeType(analysis.creative_type)],
              ["Analyzed", formatReportDate(reportDate)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-black/[0.02] px-3.5 py-2.5 ring-1 ring-black/[0.03]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-text-primary">{value}</p>
              </div>
            ))}
          </div>

          {displayNotes.length > 0 && (
            <div className="mt-4 flex gap-2.5 rounded-xl bg-[#f59e0b]/[0.06] px-4 py-3 ring-1 ring-[#f59e0b]/15">
              <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 1.5L15 14H1L8 1.5Z" stroke="#d97706" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M8 6.5V9.5M8 11.5H8.01" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <div className="space-y-1 text-xs leading-relaxed text-text-secondary">
                {displayNotes.map((note, i) => (
                  <p key={i}>{note}</p>
                ))}
              </div>
            </div>
          )}
        </FadeUp>

        <div className="flex flex-col items-center gap-6 md:min-w-[280px]">
          <ScoreHero score={report.overallFunnelScore} label="Overall Funnel Score" />
          <CreativeGoalBadge
            goal={analysis.creative_goal}
            showContext
            className="w-full max-w-sm text-center"
          />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="premium-card-accent w-full max-w-sm rounded-2xl p-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Strategic Verdict
            </p>
            <p className="mt-2 font-display text-lg font-medium leading-snug text-text-primary">
              {report.headline || "Analysis complete — review the tabs below for strategic direction."}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
