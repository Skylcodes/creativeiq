import Link from "next/link";
import type { AnalysisListItem } from "@/lib/types/analysis";
import { AnalysisCard } from "./analysis-card";

type RecentAnalysesProps = {
  analyses: AnalysisListItem[];
};

export function RecentAnalyses({ analyses }: RecentAnalysesProps) {
  if (analyses.length === 0) return null;

  return (
    <section className="dash-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/6 px-5 py-4 md:px-6">
        <div>
          <h2 className="dash-section-title">Recent Analyses</h2>
          <p className="mt-0.5 text-[13px] text-text-muted">
            Your latest funnel intelligence reports
          </p>
        </div>
        <Link
          href="/analyses"
          className="rounded-lg bg-[#f0f1f6] px-3 py-1.5 text-[12px] font-semibold text-[#4c3d8f] transition-colors hover:bg-[#e8e9f0]"
        >
          View all
        </Link>
      </div>

      <div className="grid gap-0 divide-y divide-black/5 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-1 xl:grid-cols-2">
        {analyses.map((analysis, i) => (
          <AnalysisCard key={analysis.id} analysis={analysis} index={i} variant="list" />
        ))}
      </div>
    </section>
  );
}
