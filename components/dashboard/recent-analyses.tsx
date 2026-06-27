import Link from "next/link";
import type { AnalysisListItem } from "@/lib/types/analysis";
import { AnalysisCard } from "./analysis-card";

type RecentAnalysesProps = {
  analyses: AnalysisListItem[];
};

export function RecentAnalyses({ analyses }: RecentAnalysesProps) {
  if (analyses.length === 0) return null;

  return (
    <section className="dash-card noise-overlay overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4 md:px-6">
        <div>
          <h2 className="dash-section-title">Recent Analyses</h2>
          <p className="mt-1 text-[13px] text-white/45">
            Your latest funnel intelligence reports
          </p>
        </div>
        <Link
          href="/analyses"
          className="btn-ghost rounded-lg border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-accent-tertiary"
        >
          View all
        </Link>
      </div>

      <div className="grid gap-0 divide-y divide-white/[0.06] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-1 xl:grid-cols-2">
        {analyses.map((analysis, i) => (
          <AnalysisCard key={analysis.id} analysis={analysis} index={i} variant="list" />
        ))}
      </div>
    </section>
  );
}
