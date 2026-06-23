"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { AnalysisReport } from "@/lib/types/report";
import {
  effortLabel,
  getNextAnalysisHint,
  impactLabel,
  inferActionCategory,
} from "@/lib/report/utils";
import {
  StrategicBreakdown,
  hasStrategicBreakdown,
} from "../shared/strategic-breakdown";

type ActionPlanTabProps = {
  report: AnalysisReport;
};

const categoryColors: Record<string, string> = {
  Creative: "bg-accent/10 text-accent",
  "Landing Page": "bg-accent-secondary/10 text-accent-secondary",
  Funnel: "bg-[#3b2b9f]/10 text-[#3b2b9f]",
};

export function ActionPlanTab({ report }: ActionPlanTabProps) {
  const actions = report.priorityActions ?? [];
  const hint = getNextAnalysisHint(report);

  const masterList = actions.map((action, i) => ({
    ...action,
    rank: i + 1,
    category: inferActionCategory(action.action),
  }));

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-xl font-semibold text-text-primary">
          Master Priority List
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Aggregated execution roadmap from creative, landing page, and ICP
          intelligence.
        </p>

        {masterList.length === 0 ? (
          <p className="mt-5 text-sm text-text-muted">
            No priority actions were generated for this report.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {masterList.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="premium-card rounded-2xl p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 font-display text-lg font-bold text-accent">
                    {item.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryColors[item.category]}`}
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
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="premium-card premium-card-accent rounded-3xl p-8">
        <p className="text-eyebrow-accent">Strategic Next Step</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-text-primary">
          What to test next
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
          {hint}
        </p>
        <div className="mt-6">
          <Link href="/analyses/new" className="btn-primary">
            Start New Analysis
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M3 8H13M9 4L13 8L9 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
