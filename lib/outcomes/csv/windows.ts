import type { ImportWindowType } from "@/lib/types/outcome";

const DAY_MS = 24 * 60 * 60 * 1000;

export function inferWindowType(
  startIso: string,
  endIso: string
): ImportWindowType {
  const start = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(startIso) ? `${startIso}T00:00:00.000Z` : startIso
  );
  const end = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(endIso) ? `${endIso}T00:00:00.000Z` : endIso
  );
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "custom";
  }
  const days = (end.getTime() - start.getTime()) / DAY_MS;
  if (days === 3) return "3d";
  if (days === 7) return "7d";
  if (days === 14) return "14d";
  return "custom";
}
