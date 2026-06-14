"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Analysis } from "@/lib/types/analysis";
import type { ComparisonReport } from "@/lib/types/comparison";
import { formatPlatforms } from "@/lib/report/utils";
import { getReportScoreBg, getReportScoreColor } from "@/lib/report/utils";
import { formatAnalysisDateTime } from "@/lib/analyses/utils";
import { ChatOpenButton } from "@/components/chat/chat-open-button";
import { ReportChatLayout } from "@/components/chat/report-chat-layout";
import { useReportChat } from "@/components/chat/use-report-chat";
import { CreativeGoalBadge } from "@/components/shared/creative-goal-badge";
import { getReportChatContextLabel } from "@/lib/chat/labels";
import { normalizeComparisonReport, getWinnerFromReport } from "@/lib/report/normalize-comparison";

type ComparisonReportViewProps = {
  analysis: Analysis;
  workspaceName: string;
  savedHooks?: import("@/lib/types/hook").HookLibraryEntry[];
};

function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? "bg-linear-to-br from-accent to-[#7c3aed] text-white shadow-[0_8px_24px_rgba(110,58,255,0.35)]"
      : rank === 2
        ? "bg-white text-text-primary ring-2 ring-accent/20"
        : "bg-white/80 text-text-secondary ring-1 ring-black/[0.06]";

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold ${styles}`}
    >
      {rank}
    </div>
  );
}

function VariantTabPanel({
  detail,
}: {
  detail: ComparisonReport["variantDetails"][number];
}) {
  const scoreColor = getReportScoreColor(detail.score);
  const scoreBg = getReportScoreBg(detail.score);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className="flex flex-col items-center rounded-2xl px-5 py-3"
          style={{ background: scoreBg }}
        >
          <span className="font-display text-3xl font-bold" style={{ color: scoreColor }}>
            {detail.score}
          </span>
          <span className="text-[10px] font-medium text-text-muted">/100</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">Individual score</p>
          {Object.entries(detail.scoreBreakdown ?? {}).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(detail.scoreBreakdown).map(([key, val]) => (
                <span
                  key={key}
                  className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] text-text-secondary"
                >
                  {key}: {val}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {detail.strengths.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent-secondary">
            Strengths
          </p>
          <ul className="mt-2 space-y-2">
            {detail.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-text-secondary">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-secondary" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.weaknesses.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-600">
            Weaknesses
          </p>
          <ul className="mt-2 space-y-2">
            {detail.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-text-secondary">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.improvements && (
        <div className="rounded-2xl border border-dashed border-accent/25 bg-accent/[0.03] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
            Optional improvement
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
            {detail.improvements}
          </p>
          {detail.productionNote && (
            <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-text-muted">
              <span className="font-semibold text-text-secondary">Production note: </span>
              {detail.productionNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ComparisonReportView({
  analysis,
  workspaceName,
  savedHooks = [],
}: ComparisonReportViewProps) {
  const report = normalizeComparisonReport(analysis.report as ComparisonReport);
  const [activeTab, setActiveTab] = useState(0);
  const { chatOpen, setChatOpen } = useReportChat();
  const contextLabel = getReportChatContextLabel(analysis);

  if (!report) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-text-secondary">Comparison report could not be loaded.</p>
        <Link href="/analyses" className="btn-secondary mt-6 inline-flex text-sm">
          Back to analyses
        </Link>
      </div>
    );
  }

  const winner = getWinnerFromReport(report);
  const platforms = formatPlatforms(analysis);

  return (
    <ReportChatLayout
      workspaceId={analysis.workspace_id}
      analysisId={analysis.id}
      contextLabel={contextLabel}
      chatOpen={chatOpen}
      onChatOpenChange={setChatOpen}
    >
    <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-4 md:px-8">
      {savedHooks.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-[#0d9488]/8 px-4 py-3 ring-1 ring-[#0d9488]/15">
          <p className="text-sm text-[#0d9488]">
            {savedHooks.length} hook{savedHooks.length !== 1 ? "s" : ""} saved to your library from this comparison
          </p>
          <Link href="/hooks" className="text-xs font-semibold text-[#0d9488] hover:underline">
            View library →
          </Link>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-50" />
      </div>

      <div className="relative">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/analyses"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M9 3L4 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All analyses
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <ChatOpenButton onClick={() => setChatOpen(true)} />
            <span className="text-xs text-text-muted">
              {workspaceName} · {formatAnalysisDateTime(analysis.created_at)}
            </span>
          </div>
        </div>

        {/* Winner banner */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-linear-to-br from-accent via-[#7c3aed] to-[#9333ea] p-8 text-white shadow-[0_20px_60px_rgba(110,58,255,0.35)] md:p-10"
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
            Winner · {platforms}
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {winner?.label ?? "Top variant"}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/90 md:text-lg">
            {report.winnerVerdict}
          </p>
          {winner && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
              Score: {winner.score}/100
            </div>
          )}
        </motion.div>

        <div className="mt-4 flex justify-center">
          <CreativeGoalBadge goal={analysis.creative_goal} showContext className="text-center" />
        </div>

        {/* Ranking strip */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {report.rankings.map((r) => {
            const isFirst = r.rank === 1;
            return (
              <motion.div
                key={r.variantId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + r.rank * 0.06 }}
                className={`rounded-2xl p-4 transition-all ${
                  isFirst
                    ? "bg-white shadow-[0_12px_40px_rgba(110,58,255,0.14)] ring-2 ring-accent/25 lg:scale-[1.02]"
                    : r.rank === 2
                      ? "bg-white/90 ring-1 ring-black/[0.06]"
                      : "bg-white/70 ring-1 ring-black/[0.04] opacity-90"
                }`}
              >
                <div className="flex items-start gap-3">
                  <RankBadge rank={r.rank} />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold ${isFirst ? "text-text-primary" : "text-text-secondary"}`}>
                      {r.label}
                    </p>
                    <p
                      className="mt-1 font-display text-xl font-bold"
                      style={{ color: getReportScoreColor(r.score) }}
                    >
                      {r.score}
                      <span className="text-xs font-normal text-text-muted">/100</span>
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                      {r.reason}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Variant tabs */}
        <div className="mt-10 rounded-2xl bg-white/80 p-5 ring-1 ring-black/[0.04] md:p-7">
          <div className="flex flex-wrap gap-2 border-b border-black/[0.06] pb-4">
            {report.variantDetails.map((v, i) => (
              <button
                key={v.variantId}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === i
                    ? "bg-accent text-white shadow-[0_4px_14px_rgba(110,58,255,0.25)]"
                    : "bg-black/[0.04] text-text-secondary hover:text-text-primary"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="pt-6">
            {report.variantDetails[activeTab] && (
              <VariantTabPanel detail={report.variantDetails[activeTab]} />
            )}
          </div>
        </div>

        {/* Key insights */}
        <div className="mt-10 rounded-2xl border border-accent/15 bg-linear-to-br from-accent/[0.06] to-white p-6 md:p-8">
          <h2 className="font-display text-xl font-semibold text-text-primary">
            Key insights
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
                The deciding factor
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {report.keyInsights.decidingFactor}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent-secondary">
                The pattern
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {report.keyInsights.pattern}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#9333ea]">
                The next test
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {report.keyInsights.nextTest}
              </p>
            </div>
          </div>
        </div>

        {report.noneStrongEnough && report.recommendedHybrid && (
          <div className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-amber-500/20 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-amber-600">
              Recommended hybrid
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              None of your variants are strong enough to launch as-is. This
              combines the best elements into one stronger creative:
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
              {report.recommendedHybrid.script}
            </p>
            <p className="mt-4 rounded-xl bg-black/[0.03] px-4 py-3 text-xs text-text-muted">
              <span className="font-semibold text-text-secondary">Production note: </span>
              {report.recommendedHybrid.productionNote}
            </p>
          </div>
        )}
      </div>
    </div>
    </ReportChatLayout>
  );
}
