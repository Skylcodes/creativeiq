import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type AnalysisReportPageProps = {
  params: Promise<{ id: string }>;
};

/** Legacy route — canonical report URL is /report/[id] */
export default async function AnalysisReportPage({
  params,
}: AnalysisReportPageProps) {
  const { id } = await params;
  redirect(`/report/${id}`);
}
