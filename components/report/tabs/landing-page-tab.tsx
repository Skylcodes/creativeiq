"use client";

import { motion } from "framer-motion";
import type { AnalysisReport, ConversionCategory } from "@/lib/types/report";
import {
  categoryPercent,
  effortLabel,
  getFunnelContinuity,
  getReportScoreColor,
  impactLabel,
} from "@/lib/report/utils";
import { ScoreHero } from "../shared/score-hero";

function CategoryCard({ cat }: { cat: ConversionCategory }) {
  const pct = categoryPercent(cat);
  const color = getReportScoreColor(pct);

  return (
    <div className="dashboard-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text-primary">{cat.label}</h3>
        <span className="text-sm font-bold" style={{ color }}>
          {cat.score}
          <span className="font-medium text-text-muted">/{cat.maxScore}</span>
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.05]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-text-secondary">{cat.verdict}</p>
      {cat.improvement && (
        <p className="mt-2 text-sm leading-relaxed text-accent">
          <span className="font-semibold">Fix:</span> {cat.improvement}
        </p>
      )}
    </div>
  );
}

type LandingPageTabProps = {
  report: AnalysisReport;
};

export function LandingPageTab({ report }: LandingPageTabProps) {
  const categories = report.conversionScore?.categories ?? [];
  const hasFunnelContinuity = categories.some((c) => c.key === "funnel_continuity");
  const continuity = hasFunnelContinuity ? getFunnelContinuity(report) : null;
  const improvements = report.priorityActions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-6 dashboard-panel p-8 md:flex-row md:justify-center md:gap-12">
        <ScoreHero
          score={report.conversionScore?.total ?? 0}
          label="Conversion Score"
          size="md"
        />
        <div className="max-w-md text-center md:text-left">
          <p className="text-sm font-semibold text-text-primary">Interpretation</p>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {report.conversionScore?.total >= 85
              ? "Your landing page is conversion-ready with minor optimization opportunities."
              : report.conversionScore?.total >= 60
                ? "Solid foundation, but specific friction points are suppressing conversions."
                : "Significant landing page gaps are likely bleeding paid traffic."}
          </p>
        </div>
      </div>

      {continuity && (
        <div
          className={`rounded-2xl px-5 py-4 ring-1 ${
            continuity.aligned
              ? "bg-[#0d9488]/[0.06] ring-[#0d9488]/20"
              : "bg-[#ef4444]/[0.06] ring-[#ef4444]/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                continuity.aligned ? "bg-[#0d9488]/15" : "bg-[#ef4444]/15"
              }`}
            >
              {continuity.aligned ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3.5 8L6.5 11L12.5 4.5" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M4 4L12 12M12 4L4 12" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div>
              <p
                className={`font-semibold ${continuity.aligned ? "text-[#0d9488]" : "text-[#ef4444]"}`}
              >
                {continuity.message}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                {continuity.detail}
              </p>
            </div>
          </div>
        </div>
      )}

      {categories.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-text-primary">
            Category Breakdown
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Weighted dimensions calibrated to your selected creative goal.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {categories.map((cat) => (
              <CategoryCard key={cat.key} cat={cat} />
            ))}
          </div>
        </section>
      )}

      {improvements.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-text-primary">
            Priority Improvements
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Ranked by estimated impact on conversion rate.
          </p>
          <div className="mt-5 space-y-3">
            {improvements.map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 dashboard-panel p-5 sm:flex-row sm:items-center"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 font-display text-sm font-bold text-accent">
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-text-primary">
                  {item.action}
                </p>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <span className="rounded-full bg-accent-secondary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent-secondary">
                    {impactLabel(item.impact)} impact
                  </span>
                  <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
                    {effortLabel(item.effort)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
