"use client";

import type { AnalysisReport, PriorityAction } from "@/lib/types/report";
import { effortLabel } from "@/lib/report/utils";

type TopPriorityProps = {
  report: AnalysisReport;
};

function scrollToActions() {
  document.getElementById("section-actions")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function topAction(report: AnalysisReport): PriorityAction | null {
  const actions = report.priorityActions ?? [];
  if (actions.length === 0) return null;
  const high = actions.find((a) => a.impact === "high");
  return high ?? actions[0];
}

export function TopPrioritySection({ report }: TopPriorityProps) {
  const action = topAction(report);
  const score = Math.max(
    report.creativeStrengthScore ?? 0,
    report.overallFunnelScore ?? 0
  );
  const hasHighImpact = (report.priorityActions ?? []).some(
    (a) => a.impact === "high"
  );
  const strong = score >= 85 && !hasHighImpact;

  if (strong) {
    const opt =
      (report.priorityActions ?? [])[0]?.action ??
      report.angleRecommendations?.[0]?.angle ??
      "Keep iterating on the winning angle while the creative is still fresh.";

    return (
      <section id="section-top-priority" className="scroll-mt-24">
        <div className="overflow-hidden rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/[0.18] via-emerald-500/[0.08] to-accent/[0.12] px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M3.5 8.5L6.5 11.5L12.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/90">
                  Ready to launch
                </p>
              </div>
              <p className="mt-3 text-lg font-semibold leading-snug text-white md:text-xl">
                This creative is strong enough to put budget behind.
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
                Most valuable optimization while it&apos;s already working: {opt}
              </p>
            </div>
            {(report.priorityActions?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={scrollToActions}
                className="shrink-0 self-start rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.1] hover:text-white"
              >
                See full action plan ↓
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (!action) {
    return (
      <section id="section-top-priority" className="scroll-mt-24">
        <div className="overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/25 via-accent/10 to-[#0d9488]/10 px-5 py-5 md:px-6 md:py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-tertiary">
            Top priority
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            No high-impact blockers were identified.
          </p>
          <p className="mt-2 text-sm text-white/70">
            Review the creative and funnel sections below for smaller optimizations.
          </p>
        </div>
      </section>
    );
  }

  const why =
    action.whyItMatters?.trim() ||
    action.expectedImpact?.trim() ||
    action.currentProblem?.trim() ||
    "Fixing this removes the highest-friction point limiting conversion.";

  return (
    <section id="section-top-priority" className="scroll-mt-24">
      <div className="overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/30 via-[#5b3dff]/18 to-accent-secondary/10 px-5 py-5 shadow-[0_0_40px_-12px_rgba(105,71,255,0.45)] md:px-6 md:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c4b5ff]">
              Top priority
            </p>
            <p className="mt-3 text-xl font-semibold leading-snug tracking-[-0.02em] text-white md:text-2xl">
              {action.action}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
              {why}
            </p>
            <div className="mt-4">
              <span className="rounded-full bg-white/[0.1] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/85">
                {effortLabel(action.effort) === "Major Change"
                  ? "Major Lift"
                  : effortLabel(action.effort)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToActions}
            className="shrink-0 self-start rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.14]"
          >
            See full action plan ↓
          </button>
        </div>
      </div>
    </section>
  );
}
