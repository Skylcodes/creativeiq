export const DECONSTRUCTION_PLATFORMS = [
  { id: "meta_feed", label: "Meta Feed" },
  { id: "meta_reels", label: "Meta Reels / Stories" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "other", label: "Other" },
] as const;

export const DECONSTRUCTION_TIMEOUT_MS = 5 * 60 * 1000;

export const DECONSTRUCTION_PROGRESS_STEPS = [
  { message: "Verifying performance evidence…", durationMs: 4000 },
  { message: "Analyzing creative structure…", durationMs: 5000 },
  { message: "Mapping psychological triggers…", durationMs: 5000 },
  { message: "Translating strategy to your brand…", durationMs: 6000 },
] as const;
