import Link from "next/link";
import type { AnalysisListItem } from "@/lib/types/analysis";
import { AnalysisCard } from "./analysis-card";

type RecentAnalysesProps = {
  analyses: AnalysisListItem[];
};

export function RecentAnalyses({ analyses }: RecentAnalysesProps) {
  if (analyses.length === 0) return null;

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            Recent Analyses
          </h2>
          <p className="mt-0.5 text-sm text-text-muted">
            Your latest funnel intelligence reports
          </p>
        </div>
        <Link
          href="/analyses"
          className="text-sm font-medium text-accent transition-colors hover:text-accent-hover"
        >
          View all
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {analyses.map((analysis, i) => (
          <AnalysisCard key={analysis.id} analysis={analysis} index={i} />
        ))}
      </div>
    </section>
  );
}
