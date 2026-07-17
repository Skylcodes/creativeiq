/**
 * Logical upsert identity for launch_outcomes. Confirm uses Supabase
 * `onConflict: "launch_id,window_type"` (unique index); re-import updates in place.
 */
export function outcomeUpsertKey(launchId: string, windowType: string): string {
  return `${launchId}:${windowType}`;
}
