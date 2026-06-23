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
import type { HookLibraryEntry } from "@/lib/types/hook";
import { normalizeReport } from "@/lib/report/normalize";
import { ReportTabs } from "@/components/report/report-tabs";
import { ScoreHero } from "@/components/report/shared/score-hero";
import { buildHookLookup } from "@/lib/hooks/utils";
import type { HookSaveContext } from "@/components/hooks/hook-row-actions";
import { PremiumCard } from "@/components/ui/premium-card";
import {
  normalizeComparisonReport,
  getWinnerFromReport,
} from "@/lib/report/normalize-comparison";

type ComparisonReportViewProps = {
  analysis: Analysis;
  workspaceName: string;
  savedHooks?: import("@/lib/types/hook").HookLibraryEntry[];
};

function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? "bg-accent text-white shadow-soft"
      : rank === 2
        ? "dashboard-panel text-text-primary ring-2 ring-accent/20"
        : "premium-card-glass text-text-secondary";

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold ${styles}`}
    >
      {rank}
    </div>
  );
}

function resolveAnalysisPlatform(analysis: Analysis): string | null {
  const p = analysis.platforms?.[0];
  if (!p || p === "other") return analysis.platform_other ?? null;
  return p;
}

function VariantTabPanel({
  detail,
  hookLookup,
  hookSaveBase,
  onHookSaved,
}: {
  detail: ComparisonReport["variantDetails"][number];
  hookLookup?: Map<string, HookLibraryEntry>;
  hookSaveBase?: HookSaveContext;
  onHookSaved?: (hook: HookLibraryEntry) => void;
}) {
  if (detail.analysisReport) {
    const variantReport = normalizeReport(detail.analysisReport);

    return (
      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
          <PremiumCard padding="md" className="max-w-2xl">
            <p className="card-eyebrow tracking-[0.18em]">Strategic Verdict</p>
            <p className="mt-2 font-display text-lg font-medium leading-snug text-text-primary">
              {variantReport.headline ||
                "Analysis complete — review the tabs below for strategic direction."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="insight-chip">
                Creative: {variantReport.creativeStrengthScore}/100
              </span>
              <span className="insight-chip">
                Conversion: {variantReport.conversionScore.total}/100
              </span>
            </div>
          </PremiumCard>
          <ScoreHero
            score={variantReport.overallFunnelScore}
            label="Overall Funnel Score"
            size="md"
          />
        </div>

        <ReportTabs
          report={variantReport}
          hookLookup={hookLookup}
          hookSaveBase={
            hookSaveBase
              ? {
                  ...hookSaveBase,
                  captureKeySuffix: `variant-${detail.variantId}`,
                }
              : undefined
          }
          onHookSaved={onHookSaved}
        />
      </div>
    );
  }

  const scoreColor = getReportScoreColor(detail.score);
  const scoreBg = getReportScoreBg(detail.score);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div
          className="flex flex-col items-center rounded-2xl px-5 py-3"
          style={{ background: scoreBg }}
        >
          <span
            className="font-display text-3xl font-bold"
            style={{ color: scoreColor }}
          >
            {detail.score}
          </span>
          <span className="text-[10px] font-medium text-text-muted">/100</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            Overall funnel score
          </p>
          {Object.entries(detail.scoreBreakdown ?? {}).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(detail.scoreBreakdown).map(([key, val]) => (
                <span key={key} className="insight-chip text-[11px]">
                  {key}: {val}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {detail.strengths.length > 0 && (
        <div>
          <p className="card-eyebrow tracking-[0.1em]">Strengths</p>
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
          <p className="card-eyebrow tracking-[0.1em]">Optional improvement</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
            {detail.improvements}
          </p>
          {detail.productionNote && (
            <p className="dashboard-panel mt-3 px-3 py-2 text-xs text-text-muted">
              <span className="font-semibold text-text-secondary">
                Production note:{" "}
              </span>
              {detail.productionNote}
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-text-muted">
        Re-run this comparison to load the full analysis-style feedback for{" "}
        {detail.label}.
      </p>
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
  const [libraryHooks, setLibraryHooks] = useState(savedHooks);
  const hookLookup = buildHookLookup(libraryHooks);
  const { chatOpen, setChatOpen } = useReportChat();
  const contextLabel = getReportChatContextLabel(analysis);

  const hookSaveBase: HookSaveContext | undefined = report
    ? {
        workspaceId: analysis.workspace_id,
        sourceKind: "comparison",
        sourceAnalysisId: analysis.id,
        platform: resolveAnalysisPlatform(analysis),
        sourceScore: analysis.funnel_score,
      }
    : undefined;

  function handleHookSaved(hook: HookLibraryEntry) {
    setLibraryHooks((prev) => {
      const key = hook.hook_text.trim().toLowerCase();
      if (prev.some((h) => h.hook_text.trim().toLowerCase() === key)) return prev;
      return [...prev, hook];
    });
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-text-secondary">
          Comparison report could not be loaded.
        </p>
        <Link
          href="/analyses"
          className="btn-secondary mt-6 inline-flex text-sm"
        >
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
        {libraryHooks.length > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-[#0d9488]/8 px-4 py-3 ring-1 ring-[#0d9488]/15">
            <p className="text-sm text-[#0d9488]">
              {libraryHooks.length} hook{libraryHooks.length !== 1 ? "s" : ""} saved
              to your library from this comparison
            </p>
            <Link
              href="/hooks"
              className="text-xs font-semibold text-[#0d9488] hover:underline"
            >
              View library →
            </Link>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
          <div className="absolute inset-0 ambient-bg opacity-20" />
        </div>

        <div className="relative">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/analyses"
              className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <path
                  d="M9 3L4 7L9 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
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
            className="relative overflow-hidden rounded-3xl border border-accent/20 bg-accent p-8 text-white shadow-soft md:p-10"
          >
            <p className="text-eyebrow text-white/70">Winner · {platforms}</p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              {winner?.label ?? "Top variant"}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/90 md:text-lg">
              {report.winnerVerdict}
            </p>
            {winner && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                Overall funnel score: {winner.score}/100
              </div>
            )}
          </motion.div>

          <div className="mt-4 flex justify-center">
            <CreativeGoalBadge
              goal={analysis.creative_goal}
              showContext
              className="text-center"
            />
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
                      ? "premium-card shadow-soft ring-2 ring-accent/25 lg:scale-[1.02]"
                      : r.rank === 2
                        ? "dashboard-panel"
                        : "premium-card premium-card-glass opacity-90"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <RankBadge rank={r.rank} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate font-semibold ${isFirst ? "text-text-primary" : "text-text-secondary"}`}
                      >
                        {r.label}
                      </p>
                      <p
                        className="mt-1 font-display text-xl font-bold"
                        style={{ color: getReportScoreColor(r.score) }}
                      >
                        {r.score}
                        <span className="text-xs font-normal text-text-muted">
                          /100
                        </span>
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
          <div className="mt-10 dashboard-panel p-5 md:p-7">
            <div className="flex flex-wrap gap-2 border-b border-[rgba(55,41,111,0.07)] pb-4">
              {report.variantDetails.map((v, i) => (
                <button
                  key={v.variantId}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    activeTab === i
                      ? "bg-accent text-white shadow-xs"
                      : "btn-surface text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="pt-6">
              {report.variantDetails[activeTab] && (
                <VariantTabPanel
                  detail={report.variantDetails[activeTab]}
                  hookLookup={hookLookup}
                  hookSaveBase={hookSaveBase}
                  onHookSaved={handleHookSaved}
                />
              )}
            </div>
          </div>

          {/* Key insights */}
          <div className="mt-10 premium-card premium-card-accent rounded-2xl p-6 md:p-8">
            <h2 className="text-display-md">Key insights</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-eyebrow-accent">The deciding factor</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {report.keyInsights.decidingFactor}
                </p>
              </div>
              <div>
                <p className="card-eyebrow tracking-[0.1em]">The pattern</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {report.keyInsights.pattern}
                </p>
              </div>
              <div>
                <p className="card-eyebrow tracking-[0.1em]">The next test</p>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {report.keyInsights.nextTest}
                </p>
              </div>
            </div>
          </div>

          {report.noneStrongEnough && report.recommendedHybrid && (
            <div className="dashboard-panel mt-8 p-6 ring-1 ring-amber-500/20 md:p-8">
              <p className="card-eyebrow tracking-[0.1em] text-amber-700">
                Recommended hybrid
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                None of your variants are strong enough to launch as-is. This
                combines the best elements into one stronger creative:
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                {report.recommendedHybrid.script}
              </p>
              <p className="dashboard-panel mt-4 px-4 py-3 text-xs text-text-muted">
                <span className="font-semibold text-text-secondary">
                  Production note:{" "}
                </span>
                {report.recommendedHybrid.productionNote}
              </p>
            </div>
          )}
        </div>
      </div>
    </ReportChatLayout>
  );
}
