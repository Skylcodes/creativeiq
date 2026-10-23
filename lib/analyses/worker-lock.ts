/**
 * Atomic single-flight lease for the analysis worker.
 * A second invocation cannot claim a row that already has worker_locked_at.
 *
 * Query builders are thenables (Supabase PostgrestBuilder), not full Promises.
 */
type LockQuery = {
  eq: (column: string, value: unknown) => LockQuery;
  is: (column: string, value: unknown) => LockQuery;
  select: (columns?: string) => LockQuery;
  maybeSingle: () => PromiseLike<{
    data: { id: string } | null;
    error: { message: string } | null;
  }>;
};

export type WorkerLockClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => LockQuery;
  };
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
