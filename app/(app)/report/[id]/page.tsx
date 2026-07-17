import Link from "next/link";
import { ComparisonReportView } from "@/components/report/comparison-report-view";
import { ReportExperience } from "@/components/report/report-experience";
import { ReportPending } from "@/components/report/report-pending";
import { getReportPageData, requireReportUser } from "@/lib/report/page-data";
import { getHooksBySource } from "@/lib/hooks/queries";
import { getLaunchesForAnalysis } from "@/lib/outcomes/queries";
import { isComparisonReport } from "@/lib/report/normalize-comparison";

export const dynamic = "force-dynamic";

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const user = await requireReportUser();
  const { id } = await params;
  const { analysis, workspaceName, workspaceId } = await getReportPageData(id, user.id);

  const savedHooks =
    analysis.status === "completed"
      ? await getHooksBySource(workspaceId, { analysisId: analysis.id })
      : [];

  const launches =
    analysis.status === "completed"
      ? await getLaunchesForAnalysis(analysis.id)
      : [];

  if (analysis.status === "processing" || analysis.status === "pending") {
    return <ReportPending analysisId={analysis.id} status={analysis.status} />;
  }

  if (analysis.status === "failed") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ef4444]/10 ring-1 ring-[#ef4444]/20">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
            <circle cx="13" cy="13" r="9" stroke="#ef4444" strokeWidth="1.5" />
            <path d="M13 8.5V13.5M13 17H13.01" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-semibold text-text-primary">
          This analysis failed
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
          {analysis.error_message ??
            "Something went wrong while generating this report."}
        </p>
        <Link href="/analyses/new" className="btn-primary mt-7 text-sm">
          Start a new analysis
        </Link>
      </div>
    );
  }

  if (!analysis.report) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-xl font-semibold text-text-primary">
          Report unavailable
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          This analysis completed but the report could not be loaded.
        </p>
        <Link href="/dashboard" className="btn-secondary mt-7 text-sm">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return analysis.analysis_mode === "comparison" ||
    isComparisonReport(analysis.report) ? (
    <ComparisonReportView
      analysis={analysis}
      workspaceName={workspaceName}
      savedHooks={savedHooks}
      launches={launches}
    />
  ) : (
    <ReportExperience
      analysis={analysis}
      workspaceName={workspaceName}
      savedHooks={savedHooks}
      launches={launches}
    />
  );
}
