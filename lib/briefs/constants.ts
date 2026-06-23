import type {
  AdBudget,
  AudienceTemperature,
  BriefGoal,
  ProductionResource,
} from "@/lib/types/brief";

export const BRIEF_GOALS: {
  id: BriefGoal;
  label: string;
  description: string;
}[] = [
  {
    id: "drive_purchases",
    label: "Drive purchases",
    description: "Convert cold or warm traffic into buyers",
  },
  {
    id: "generate_leads",
    label: "Generate leads",
    description: "Capture emails, sign-ups, or demo requests",
  },
  {
    id: "brand_awareness",
    label: "Build brand awareness",
    description: "Introduce the brand to new audiences",
  },
  {
    id: "promote_sale",
    label: "Promote a sale or offer",
    description: "Push a limited-time deal or promotion",
  },
  {
    id: "launch_product",
    label: "Launch a new product",
    description: "Introduce something new to the market",
  },
  {
    id: "retarget_warm",
    label: "Retarget warm audiences",
    description: "Re-engage site visitors, engagers, or cart abandoners",
  },
];

export const BRIEF_PLATFORMS = [
  { id: "meta_feed", label: "Meta Feed", icon: "meta_feed" },
  { id: "meta_stories", label: "Meta Stories", icon: "meta_stories" },
  { id: "tiktok", label: "TikTok", icon: "tiktok" },
  { id: "instagram", label: "Instagram", icon: "instagram" },
  { id: "youtube", label: "YouTube", icon: "youtube" },
  { id: "organic", label: "Organic", icon: "organic" },
] as const;

export const AUDIENCE_TEMPERATURES: {
  id: AudienceTemperature;
  label: string;
  description: string;
}[] = [
  {
    id: "cold",
    label: "Cold Traffic",
    description: "Never heard of you",
  },
  {
    id: "warm",
    label: "Warm Traffic",
    description: "Visited your site or engaged with content",
  },
  {
    id: "hot",
    label: "Hot Traffic",
    description: "Existing customers or high intent",
  },
];

export const PRODUCTION_RESOURCES: {
  id: ProductionResource;
  label: string;
  description: string;
}[] = [
  {
    id: "full_production",
    label: "Full production team",
    description: "Agency or studio with crew and gear",
  },
  {
    id: "in_house",
    label: "In-house filmmaker",
    description: "Dedicated videographer on your team",
  },
  {
    id: "ugc_creator",
    label: "UGC creator or influencer",
    description: "Creator you brief and send product to",
  },
  {
    id: "phone_only",
    label: "Just me with my phone",
    description: "Self-filmed, minimal setup",
  },
];

export const AD_BUDGETS: { id: AdBudget; label: string }[] = [
  { id: "under_500", label: "Under $500" },
  { id: "500_2000", label: "$500 to $2,000" },
  { id: "2000_10000", label: "$2,000 to $10,000" },
  { id: "10000_plus", label: "$10,000+" },
];

export const VIDEO_DURATIONS_TIKTOK = [
  { id: "15s", label: "15 seconds" },
  { id: "30s", label: "30 seconds" },
  { id: "60s", label: "60 seconds" },
  { id: "90s_plus", label: "90+ seconds" },
];

export const VIDEO_DURATIONS_META = [
  { id: "15s", label: "15 seconds" },
  { id: "30s", label: "30 seconds" },
  { id: "60s", label: "60 seconds" },
  { id: "2min_plus", label: "2 minutes+" },
];

export const STATIC_DURATIONS = [
  { id: "single_image", label: "Single image" },
  { id: "carousel", label: "Carousel" },
];

export function getDurationOptions(platform: string) {
  if (platform === "meta_feed" || platform === "organic") {
    return [...VIDEO_DURATIONS_META, ...STATIC_DURATIONS];
  }
  return VIDEO_DURATIONS_TIKTOK;
}

/** Legacy briefs stored a single `platform` string — normalize to an array. */
export function getBriefPlatforms(
  input: { platforms?: string[]; platform?: string } | null | undefined
): string[] {
  if (!input) return [];
  if (Array.isArray(input.platforms) && input.platforms.length > 0) {
    return input.platforms;
  }
  if (typeof input.platform === "string" && input.platform) {
    return [input.platform];
  }
  return [];
}

export function briefPlatformLabels(
  input: { platforms?: string[]; platform?: string } | null | undefined
): string {
  return getBriefPlatforms(input)
    .map((id) => BRIEF_PLATFORMS.find((p) => p.id === id)?.label ?? id)
    .join(", ");
}

export function getDurationOptionsForPlatforms(platforms: string[]) {
  if (platforms.length === 0) return VIDEO_DURATIONS_TIKTOK;

  const hasMetaStyle = platforms.some(
    (p) => p === "meta_feed" || p === "organic"
  );
  const hasShortForm = platforms.some(
    (p) => p !== "meta_feed" && p !== "organic"
  );

  const byId = new Map<string, { id: string; label: string }>();

  if (hasMetaStyle) {
    for (const option of [...VIDEO_DURATIONS_META, ...STATIC_DURATIONS]) {
      byId.set(option.id, option);
    }
  }
  if (hasShortForm) {
    for (const option of VIDEO_DURATIONS_TIKTOK) {
      byId.set(option.id, option);
    }
  }

  return [...byId.values()];
}

export function isStaticCreative(duration: string): boolean {
  return duration === "single_image" || duration === "carousel";
}

export const BRIEF_WIZARD_STEPS = [
  { num: 1, label: "Goal" },
  { num: 2, label: "Audience" },
  { num: 3, label: "Angle" },
  { num: 4, label: "Production" },
  { num: 5, label: "Review" },
] as const;

export const BRIEF_PROGRESS_STEPS = [
  { message: "Analyzing your brand positioning...", durationMs: 4000 },
  { message: "Identifying the highest leverage angle for your audience...", durationMs: 4500 },
  { message: "Writing your hook options...", durationMs: 4000 },
  { message: "Building your shot list...", durationMs: 4000 },
  { message: "Crafting your script...", durationMs: 4500 },
  { message: "Finalizing your production brief...", durationMs: 4000 },
] as const;

export const BRIEF_TIMEOUT_MS = 4 * 60 * 1000;
