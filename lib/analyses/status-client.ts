import type { AnalysisStatus } from "@/lib/types/analysis";

export type AnalysisStatusResponse = {
  status: AnalysisStatus;
  error_message: string | null;
  retriggered?: boolean;
};

export async function fetchAnalysisStatus(
  analysisId: string
): Promise<AnalysisStatusResponse | null> {
  try {
    const res = await fetch(`/api/analyses/${analysisId}/status`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AnalysisStatusResponse;
  } catch {
    return null;
  }
}
