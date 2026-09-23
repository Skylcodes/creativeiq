export const ANALYSIS_PLATFORMS = [
  {
    id: "meta_feed",
    label: "Meta Feed",
    description: "Facebook & Instagram feed placements",
    icon: "meta_feed",
  },
  {
    id: "meta_stories",
    label: "Meta Stories",
    description: "Stories & Reels format",
    icon: "meta_stories",
  },
  {
    id: "tiktok",
    label: "TikTok",
    description: "Short-form vertical video",
    icon: "tiktok",
  },
  {
    id: "youtube",
    label: "YouTube",
    description: "Pre-roll, in-stream & Shorts",
    icon: "youtube",
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "Feed, Reels & Explore",
    icon: "instagram",
  },
  {
    id: "other",
    label: "Other",
    description: "Custom platform or placement",
    icon: "other",
  },
] as const;

/** Single-select platforms for variant comparison wizard (includes Organic). */
export const COMPARISON_PLATFORMS = [
  ...ANALYSIS_PLATFORMS.filter((p) => p.id !== "other"),
  {
    id: "organic",
    label: "Organic",
    description: "Organic social — no paid placement",
    icon: "organic",
  },
  {
    id: "other",
    label: "Other",
    description: "Custom platform or placement",
    icon: "other",
  },
] as const;

export type ComparisonPlatformId = (typeof COMPARISON_PLATFORMS)[number]["id"];

export const COMPARISON_TEST_DIMENSIONS = [
  {
    id: "hook",
    label: "Hook / Opening",
    description: "First 3 seconds, scroll-stop, pattern interrupt",
  },
  {
    id: "script_copy",
    label: "Script / Copy",
    description: "Body copy, claims, pacing, voice",
  },
  {
    id: "visual_style",
    label: "Visual Style",
    description: "Format, aesthetic, on-screen text, hierarchy",
  },
  {
    id: "cta",
    label: "CTA",
    description: "Call to action wording and placement in the ad",
  },
  {
    id: "full_creative",
    label: "Full Creative",
    description: "Evaluate the entire ad as a whole",
  },
] as const;

export const COMPARISON_INDIVIDUAL_STEPS = [
  { message: "Evaluating variant hook strength...", durationMs: 3500 },
  { message: "Scoring scroll-stopping power...", durationMs: 3500 },
  { message: "Analyzing creative differences...", durationMs: 3000 },
] as const;

export const COMPARISON_SYNTHESIS_STEPS = [
  { message: "Agents debating which hook stops the scroll...", durationMs: 4000 },
  { message: "Contrarian Strategist finding the angle none of these use...", durationMs: 4000 },
  { message: "Verdict Agent ranking your variants...", durationMs: 4000 },
] as const;

export type PlatformId = (typeof ANALYSIS_PLATFORMS)[number]["id"];

export const CREATIVE_TABS = ["image", "video", "script"] as const;

export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
/** App + bucket hard cap for video creatives (was 500MB — unbounded storage risk). */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
/** Standard Supabase upload is unreliable above ~6MB — use TUS above this. */
export const RESUMABLE_UPLOAD_THRESHOLD_BYTES = 6 * 1024 * 1024;
export const MIN_SCRIPT_LENGTH = 50;

/** Shown in the progress screen before video processing and agents — real-world data gathering. */
export const INTELLIGENCE_STEPS = [
  { message: "Scanning competitor ads...", durationMs: 3500 },
  { message: "Researching what this audience watches...", durationMs: 4000 },
  { message: "Finding winning hooks in this niche...", durationMs: 4000 },
  { message: "Mapping buyer psychology & objections...", durationMs: 3500 },
  { message: "Analyzing platform trends...", durationMs: 3500 },
  { message: "Mapping customer frustrations...", durationMs: 3000 },
  { message: "Building intelligence brief...", durationMs: 3000 },
] as const;

/** Shown in the progress screen before agents activate for video uploads. */
export const VIDEO_PROCESSING_STEPS = [
  { message: "Extracting audio from your video...", durationMs: 8000 },
  { message: "Transcribing ad voiceover...", durationMs: 14000 },
  { message: "Analyzing visual frames...", durationMs: 10000 },
  { message: "Building creative brief for agents...", durationMs: 8000 },
] as const;

export const ANALYSIS_AGENTS = [
  {
    id: "brand_context",
    name: "Brand Context Engine",
    icon: "brand",
    messages: [
      "Reading your brand profile...",
      "Mapping product positioning...",
      "Building audience context...",
    ],
    durationMs: 9000,
  },
  {
    id: "skeptical_buyer",
    name: "Your Ideal Customer",
    icon: "buyer",
    messages: [
      "Raising every objection your customer would have...",
      "Stress-testing purchase intent...",
      "Simulating real buyer hesitation...",
    ],
    durationMs: 10000,
  },
  {
    id: "direct_response",
    name: "The Direct Response Critic",
    icon: "critic",
    messages: [
      "Evaluating hook strength and CTA logic...",
      "Scoring scroll-stopping power...",
      "Auditing conversion copy...",
    ],
    durationMs: 10000,
  },
  {
    id: "competition_analysis",
    name: "Competition Analysis",
    icon: "competition",
    messages: [
      "Scanning competitor creative angles...",
      "Mapping what winning ads in your niche are doing...",
      "Identifying gaps in competitor positioning...",
    ],
    durationMs: 10000,
  },
  {
    id: "landing_page",
    name: "Landing Page Analyzer",
    icon: "landing",
    messages: [
      "Scoring your conversion funnel...",
      "Auditing page-to-ad message match...",
      "Mapping friction points...",
    ],
    durationMs: 11000,
  },
  {
    id: "funnel_match",
    name: "Funnel Match Agent",
    icon: "funnel",
    messages: [
      "Checking ad-to-landing page continuity...",
      "Measuring promise vs. page delivery...",
      "Flagging message mismatch risks...",
    ],
    durationMs: 10000,
  },
  {
    id: "verdict",
    name: "The Verdict Agent",
    icon: "verdict",
    messages: [
      "Synthesizing all findings into your final report...",
      "Prioritizing action items...",
      "Calculating funnel score...",
    ],
    durationMs: 12000,
  },
] as const;
