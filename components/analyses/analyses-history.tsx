"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnalysesFilters } from "@/components/analyses/analyses-filters";
import { AnalysesPagination } from "@/components/analyses/analyses-pagination";
import { AnalysesStatsStrip } from "@/components/analyses/analyses-stats-strip";
import { AnalysesEmptyState } from "@/components/analyses/analyses-empty-state";
import { DeleteAnalysisModal } from "@/components/analyses/delete-analysis-modal";
import { HistoryAnalysisCard } from "@/components/analyses/history-analysis-card";
import { NewAnalysisCta } from "@/components/dashboard/new-analysis-cta";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import { CompareVariantsCta } from "@/components/dashboard/compare-variants-cta";
import { useToast } from "@/components/shared/toast";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { deleteAnalysis } from "@/lib/analyses/actions";
import type { AnalysesHistoryParams } from "@/lib/analyses/history";
import type {
  AnalysesHistoryMetrics,
  AnalysisListItem,
} from "@/lib/types/analysis";

type AnalysesHistoryProps = {
  workspaceId: string;
  analyses: AnalysisListItem[];
  totalCount: number;
  metrics: AnalysesHistoryMetrics;
  params: AnalysesHistoryParams;
};

export function AnalysesHistory({
  workspaceId,
  analyses,
  totalCount,
  metrics,
  params,
}: AnalysesHistoryProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { activeWorkspace, switching } = useWorkspace();
  const [filtersPending, setFiltersPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AnalysisListItem | null>(
    null
  );
  const [deleting, startDeleteTransition] = useTransition();

  const isLoading = filtersPending || switching;

  useEffect(() => {
    if (!activeWorkspace || activeWorkspace.id === workspaceId) return;

    router.replace("/analyses");
    router.refresh();
  }, [activeWorkspace, workspaceId, router]);

  const hasActiveFilters =
    params.search.length > 0 ||
    params.platform !== "all" ||
    params.creativeType !== "all" ||
    params.sort !== "recent";

  const showEmptyLibrary = metrics.totalAnalyses === 0;
  const showNoResults = !showEmptyLibrary && totalCount === 0;

  function handleDeleteConfirm() {
    if (!deleteTarget) return;

    startDeleteTransition(async () => {
      const result = await deleteAnalysis(deleteTarget.id);

      if (!result.success) {
        showToast(result.error);
        return;
      }

      setDeleteTarget(null);
      showToast("Analysis deleted successfully.");
      router.refresh();
    });
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Intelligence Library"
        title="Analyses"
        description="Every funnel intelligence report for your workspace"
        action={
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <NewAnalysisCta label="New Analysis" size="compact" />
            <CompareVariantsCta size="compact" />
            <Link
              href="/brief"
              className="text-[13px] font-medium text-[#d97706] hover:underline"
            >
              Creative Briefs →
            </Link>
          </div>
        }
      />

      {!showEmptyLibrary && (
        <div className="mt-8">
          <AnalysesStatsStrip metrics={metrics} />
        </div>
      )}

      {!showEmptyLibrary && (
        <div className="mt-6">
          <AnalysesFilters
            key={params.search}
            params={params}
            onPendingChange={setFiltersPending}
          />
        </div>
      )}

      {showEmptyLibrary ? (
        <AnalysesEmptyState />
      ) : (
        <div
          className={`mt-6 space-y-4 transition-opacity duration-200 ${isLoading ? "opacity-60" : "opacity-100"}`}
        >
          {showNoResults ? (
            <PremiumCard padding="lg" className="text-center">
              <p className="font-display text-lg font-semibold text-text-primary">
                No analyses match your filters
              </p>
              <p className="mt-2 text-[13px] text-text-secondary">
                Try adjusting your search, platform, or type filters.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => router.push("/analyses")}
                  className="mt-5 text-[13px] font-medium text-accent hover:text-accent-hover"
                >
                  Clear all filters
                </button>
              )}
            </PremiumCard>
          ) : (
            analyses.map((analysis, index) => (
              <HistoryAnalysisCard
                key={analysis.id}
                analysis={analysis}
                index={index}
                onDelete={setDeleteTarget}
              />
            ))
          )}

          {!showNoResults && (
            <AnalysesPagination totalCount={totalCount} params={params} />
          )}
        </div>
      )}

      <DeleteAnalysisModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.title ?? "Analysis"}
        deleting={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </PageShell>
  );
}
