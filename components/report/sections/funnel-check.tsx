"use client";

import type { AnalysisReport, ConversionCategory } from "@/lib/types/report";
import { getFunnelContinuity } from "@/lib/report/utils";

function CategoryCard({ cat }: { cat: ConversionCategory }) {
  return (
    <div className="rounded-2xl border border-white/[0.1] bg-white/[0.045] p-5">
      <h3 className="text-base font-semibold text-white">{cat.label}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/75">{cat.verdict}</p>
      {cat.improvement && (
        <p className="mt-2 text-sm leading-relaxed text-white">
          <span className="font-semibold text-accent-tertiary">Fix:</span>{" "}
          {cat.improvement}
        </p>
      )}
    </div>
  );
}

type FunnelCheckSectionProps = {
  report: AnalysisReport;
};

export function FunnelCheckSection({ report }: FunnelCheckSectionProps) {
  const categories = report.conversionScore?.categories ?? [];
  const hasFunnelContinuity = categories.some((c) => c.key === "funnel_continuity");
  const continuity = hasFunnelContinuity ? getFunnelContinuity(report) : null;
  const total = report.conversionScore?.total ?? 0;

  return (
    <section id="section-funnel" className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-white md:text-2xl">
          Funnel Check
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Does the landing page deliver what the ad promised?
        </p>
      </div>

      <div className="dashboard-panel max-w-2xl p-6">
        <p className="text-sm font-semibold text-text-primary">Interpretation</p>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {total >= 85
            ? "Your landing page is conversion-ready with minor optimization opportunities."
            : total >= 60
              ? "Solid foundation, but specific friction points are suppressing conversions."
              : "Significant landing page gaps are likely bleeding paid traffic."}
        </p>
      </div>

      {continuity && (
        <div
          className={`rounded-2xl px-5 py-4 ring-1 ${
            continuity.aligned
              ? "bg-[#4ade80]/[0.06] ring-[#4ade80]/20"
              : "bg-[#ef4444]/[0.06] ring-[#ef4444]/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                continuity.aligned ? "bg-[#4ade80]/15" : "bg-[#ef4444]/15"
              }`}
            >
              {continuity.aligned ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M3.5 8L6.5 11L12.5 4.5"
                    stroke="#4ade80"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M4 4L12 12M12 4L4 12"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
            <div>
              <p
                className={`font-semibold ${
                  continuity.aligned ? "text-[#4ade80]" : "text-[#ef4444]"
                }`}
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
        <div>
          <h3 className="font-display text-lg font-semibold text-white">
            Category breakdown
          </h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {categories.map((cat) => (
              <CategoryCard key={cat.key} cat={cat} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
