/** Client-safe status payload from GET /api/analyses/[id]/status. */
export type AnalysisStatusPayload = {
  status: string;
  error_message: string | null;
  retriggered?: boolean;
};

export async function fetchAnalysisStatus(
  analysisId: string
): Promise<AnalysisStatusPayload | null> {
  try {
    const res = await fetch(`/api/analyses/${analysisId}/status`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as AnalysisStatusPayload;
  } catch {
    return null;
  }
}
