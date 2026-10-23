/**
 * Atomic single-flight lease for the analysis worker.
 * A second invocation cannot claim a row that already has worker_locked_at.
 */

export type WorkerLockClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => WorkerLockQuery;
  };
};

type WorkerLockQuery = {
  eq: (column: string, value: unknown) => WorkerLockQuery;
  is: (column: string, value: unknown) => WorkerLockQuery;
  select: (columns: string) => WorkerLockQuery;
  maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
};

export async function claimAnalysisWorkerLock(
  supabase: WorkerLockClient,
  analysisId: string,
  lockedAt: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("analyses")
    .update({
      worker_locked_at: lockedAt,
      updated_at: lockedAt,
    })
    .eq("id", analysisId)
    .eq("status", "processing")
    .is("worker_locked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.id);
}
