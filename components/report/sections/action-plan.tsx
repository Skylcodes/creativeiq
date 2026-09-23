"use client";

import type { AnalysisReport, PriorityAction } from "@/lib/types/report";
import {
  effortLabel,
  impactLabel,
  inferActionCategory,
} from "@/lib/report/utils";
import {
  StrategicBreakdown,
  hasStrategicBreakdown,
} from "../shared/strategic-breakdown";

const categoryColors: Record<string, string> = {
  Creative: "bg-accent/10 text-accent",
  "Landing Page": "bg-accent-secondary/10 text-accent-secondary",
  Funnel: "bg-[#3b2b9f]/10 text-[#3b2b9f]",
};

type ActionPlanSectionProps = {
  report: AnalysisReport;
};

function ActionCard({
  item,
  rank,
}: {
  item: PriorityAction & { category: string };
  rank: number;
}) {
  return (
    <div className="dash-card rounded-xl p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 font-display text-lg font-bold text-accent">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                categoryColors[item.category] ?? "bg-white/10 text-white/70"
              }`}
            >
              {item.category}
            </span>
            <span className="rounded-full bg-accent-secondary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-secondary">
              {impactLabel(item.impact)} impact
            </span>
            <span className="rounded-full bg-black/[0.05] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
              {effortLabel(item.effort)}
            </span>
          </div>
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-text-primary">
            {item.action}
          </p>
          {hasStrategicBreakdown(item) && (
            <StrategicBreakdown breakdown={item} compact />
          )}
        </div>
      </div>
    </div>
  );
}

export function ActionPlanSection({ report }: ActionPlanSectionProps) {
  const actions = (report.priorityActions ?? []).map((action, i) => ({
    ...action,
    rank: i + 1,
    category: inferActionCategory(action.action),
  }));

  const quickWins = actions.filter((a) => a.effort === "low");
  const biggerLifts = actions.filter((a) => a.effort !== "low");

  return (
    <section id="section-actions" className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-white md:text-2xl">
          Full Action Plan
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Ranked by expected impact. Quick wins first when effort is low.
        </p>
      </div>

      {actions.length === 0 ? (
        <p className="text-sm text-white/45">
          No priority actions were generated for this report.
        </p>
      ) : (
        <div className="space-y-8">
          {quickWins.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                  Quick Wins
                </span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>
              <div className="space-y-3">
                {quickWins.map((item) => (
                  <ActionCard key={`q-${item.rank}`} item={item} rank={item.rank} />
                ))}
              </div>
            </div>
          )}

          {biggerLifts.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                  Bigger Lifts
                </span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>
              <div className="space-y-3">
                {biggerLifts.map((item) => (
                  <ActionCard key={`b-${item.rank}`} item={item} rank={item.rank} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
