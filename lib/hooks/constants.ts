import { ANGLE_TAGS } from "@/lib/types/report";

/** Platforms available in hook library filters and manual entry. */
export const HOOK_PLATFORMS = [
  { id: "meta_feed", label: "Meta Feed" },
  { id: "meta_stories", label: "Meta Stories" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "organic", label: "Organic" },
] as const;

export type HookPlatformId = (typeof HOOK_PLATFORMS)[number]["id"];

/** Preset angle tags + library-specific additions. */
export const HOOK_PRESET_ANGLE_TAGS = [
  ...ANGLE_TAGS,
  "Curiosity Gap",
  "Pattern Interrupt",
] as const;

export type HookPresetAngleTag = (typeof HOOK_PRESET_ANGLE_TAGS)[number];

export const MANUAL_SOURCE_CATEGORIES = [
  { id: "my_own_idea", label: "My own idea" },
  { id: "competitor_ad", label: "Competitor ad" },
  { id: "inspiration", label: "Inspiration" },
  { id: "advara_generated", label: "Advara generated" },
] as const;

export type ManualSourceCategoryId = (typeof MANUAL_SOURCE_CATEGORIES)[number]["id"];

export const HOOK_SOURCE_TYPES = [
  { id: "advara_generated", label: "Advara Generated" },
  { id: "manual", label: "Manually Added" },
] as const;

export const TEST_QUEUE_TAG = "Test Queue";

export const HOOK_SORT_OPTIONS = [
  { id: "recent", label: "Most recent" },
  { id: "oldest", label: "Oldest" },
  { id: "score", label: "Highest source score" },
  { id: "alpha", label: "Alphabetical" },
] as const;

export type HookSortId = (typeof HOOK_SORT_OPTIONS)[number]["id"];

export function platformLabel(id: string | null | undefined): string {
  if (!id) return "Unspecified";
  return HOOK_PLATFORMS.find((p) => p.id === id)?.label ?? id;
}

export function manualSourceLabel(id: string | null | undefined): string {
  if (!id) return "";
  return MANUAL_SOURCE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
