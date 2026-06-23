/** Supabase may return a joined row as an object or a one-element array. */
export function joinedRowKey(
  relation: { key: string } | { key: string }[] | null | undefined
): string | undefined {
  if (!relation) return undefined;
  if (Array.isArray(relation)) return relation[0]?.key;
  return relation.key;
}
