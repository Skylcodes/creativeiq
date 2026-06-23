import type { HookLibraryEntry } from "@/lib/types/hook";
import type { HookSortId } from "@/lib/hooks/constants";

export type HookFilters = {
  search: string;
  platform: string | null;
  angleTag: string | null;
  customTag: string | null;
  sourceType: "all" | "advara_generated" | "manual";
  favorited: "all" | "yes" | "no";
  testQueue: boolean;
  sort: HookSortId;
};

export const DEFAULT_HOOK_FILTERS: HookFilters = {
  search: "",
  platform: null,
  angleTag: null,
  customTag: null,
  sourceType: "all",
  favorited: "all",
  testQueue: false,
  sort: "recent",
};

export function filterAndSortHooks(
  hooks: HookLibraryEntry[],
  filters: HookFilters
): HookLibraryEntry[] {
  let result = [...hooks];
  const q = filters.search.trim().toLowerCase();

  if (q) {
    result = result.filter(
      (h) =>
        h.hook_text.toLowerCase().includes(q) ||
        (h.notes?.toLowerCase().includes(q) ?? false)
    );
  }

  if (filters.platform) {
    result = result.filter((h) => h.platform === filters.platform);
  }

  if (filters.angleTag) {
    result = result.filter((h) => h.angle_tags.includes(filters.angleTag!));
  }

  if (filters.customTag) {
    if (filters.customTag === "__test_queue__") {
      result = result.filter((h) => h.is_in_test_queue);
    } else {
      result = result.filter((h) => h.custom_tags.includes(filters.customTag!));
    }
  }

  if (filters.sourceType !== "all") {
    result = result.filter((h) => h.source_type === filters.sourceType);
  }

  if (filters.favorited === "yes") {
    result = result.filter((h) => h.is_favorited);
  } else if (filters.favorited === "no") {
    result = result.filter((h) => !h.is_favorited);
  }

  if (filters.testQueue) {
    result = result.filter((h) => h.is_in_test_queue);
  }

  switch (filters.sort) {
    case "oldest":
      result.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      break;
    case "score":
      result.sort((a, b) => (b.source_score ?? -1) - (a.source_score ?? -1));
      break;
    case "alpha":
      result.sort((a, b) => a.hook_text.localeCompare(b.hook_text));
      break;
    case "recent":
    default:
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  return result;
}

export function findSimilarHooks(
  hook: HookLibraryEntry,
  all: HookLibraryEntry[],
  limit = 4
): HookLibraryEntry[] {
  return all
    .filter((h) => h.id !== hook.id)
    .map((h) => {
      let score = 0;
      if (h.platform && h.platform === hook.platform) score += 2;
      for (const t of h.angle_tags) {
        if (hook.angle_tags.includes(t)) score += 3;
      }
      return { h, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ h }) => h);
}
