// Structured Advara intelligence report.
// This is produced by the final extraction call and saved to analyses.report.

export const ANGLE_TAGS = [
  "Pain-Agitation-Solution",
  "Social Proof",
  "Founder Story",
  "Us vs Them",
  "Transformation",
  "Fear/Risk",
] as const;

export type AngleTag = (typeof ANGLE_TAGS)[number];

export type ConversionCategoryKey =
  | "message_match"
  | "hook_strength"
  | "social_proof"
  | "offer_clarity"
  | "lead_magnet_clarity"
  | "objection_handling"
  | "visual_ux"
  | "funnel_continuity"
  | "brand_memorability";

export type ConversionCategory = {
  key: ConversionCategoryKey;
  label: string;
  score: number;
  maxScore: number;
  verdict: string;
  improvement: string;
};

export type ConversionScore = {
  total: number;
  categories: ConversionCategory[];
};

export type AgentFinding = {
  agentId: string;
  agentName: string;
  summary: string;
  keyFindings: string[];
};

export type StrategicBreakdown = {
  currentProblem?: string;
  whyItMatters?: string;
  strategicFix?: string;
  expectedImpact?: string;
};

export type AngleRecommendation = {
  rank: number;
  angle: string;
  rationale: string;
  angleTags: AngleTag[];
  targetAudience?: string;
  psychologicalTrigger?: string;
  awarenessStage?: string;
  whyItWorks?: string;
  competitorLandscape?: string;
};

export type HookVariant = {
  rank: number;
  hook: string;
  rationale: string;
  predictedPerformance: "high" | "medium" | "experimental";
};

export type ConversionBlocker = {
  title: string;
  detail: string;
  severity: "critical" | "high" | "medium";
} & StrategicBreakdown;

export type PriorityAction = {
  action: string;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  /** Which criteria ID this action addresses (e.g. "C1", "L3") */
  criteriaRef?: string;
} & StrategicBreakdown;

/** Single criterion evaluation result stored in the report */
export type CriteriaChecklistItem = {
  id: string;             // e.g. "C1", "L3", "D1"
  category: "creative" | "landing_page" | "dynamic";
  label: string;          // the criterion text
  pass: boolean | null;   // null = not applicable for this ad's goal/format/intent
  note?: string;          // evidence for pass/fail or N/A reason
};

export type CreativeScoreBreakdown = {
  strategicScore: number;
  retentionScore: number;
  /** Why attention/retention differs from strategic quality */
  retentionVerdict?: string;
};

export type AnalysisReport = {
  schemaVersion: 1;
  generatedAt: string;

  overallFunnelScore: number;
  /** Blended creative grade (strategy + retention) */
  creativeStrengthScore: number;
  /** Strategic messaging quality vs watchability/retention */
  creativeScoreBreakdown?: CreativeScoreBreakdown;
  conversionScore: ConversionScore;

  headline: string; // one-line executive summary
  angleTags: AngleTag[];

  agentFindings: AgentFinding[];
  angleRecommendations: AngleRecommendation[];
  topBlockers: ConversionBlocker[];
  hookVariants: HookVariant[];
  scriptRewrite: string;
  priorityActions: PriorityAction[];

  // Data-quality flags surfaced to the user
  flags: {
    landingPagePartial: boolean;
    landingPageFailed: boolean;
    creativeKind: "image" | "script" | "video-placeholder" | "video";
    notes: string[];
  };

  // Populated when creative_type is "video" and processing succeeded/partially succeeded
  videoContext?: VideoContext;

  // AI-generated buyer journey simulation (replaces the derived persona logic)
  icpSimulation?: IcpSimulation;

  // Real-world intelligence gathered before agents ran (Tavily + Meta Ad Library)
  intelligenceBrief?: IntelligenceBrief;

  // Evaluation criteria checklist — pass/fail per item for this analysis
  criteriaChecklist?: CriteriaChecklistItem[];

  /** Market-grounded competitive notes (from intelligence + synthesis) */
  competitiveInsights?: string[];

  // Raw agent transcripts (kept for transparency / future re-render)
  rawAgents: Record<string, string>;
};

export type IcpPersona = {
  id: string;
  title: string;
  likelihood: "High" | "Medium" | "Low";
  summary: string;
  /** Multi-paragraph first-person narrative with phase labels in brackets */
  narrative: string;
};

export type IcpSimulation = {
  personas: IcpPersona[];
};

export type CompetitorAdQuality = "high" | "medium" | "low";

export type CompetitorAd = {
  advertiser: string;
  /** First ~300 chars of ad copy */
  copySnippet: string;
  cta: string;
  /** Days the ad has been running (undefined if unavailable) */
  runningDays?: number;
  headline?: string;
  platforms?: string[];
  /** Inferred creative format signals (UGC-native, offer-led, etc.) */
  formatSignals?: string[];
  /** First-line hook pattern extracted from copy */
  hookPattern?: string;
  /** Estimated success signal — NOT proof of performance */
  qualitySignal?: CompetitorAdQuality;
  qualityNote?: string;
  /** How many ads this advertiser has in the scraped set */
  advertiserAdCount?: number;
};

/** Internal severity tier for confirmed checklist flaws — not shown in report UI */
export type CriteriaSeverityTier = "critical" | "moderate" | "minor";

export type ToleranceImperfection =
  | "no_in_ad_price"
  | "no_text_overlay"
  | "simple_production"
  | "no_urgency"
  | "minimal_in_ad_social_proof"
  | "no_quantified_proof"
  | "soft_cta";

/** Which checklist-style gaps successful competitor ads routinely tolerate */
export type ToleranceSignal = {
  imperfection: ToleranceImperfection;
  label: string;
  prevalence: "commonly_tolerated" | "inconsistent" | "rare_among_winners";
  evidence: string;
};

export type MarketPatterns = {
  dominantHooks: string[];
  dominantAngles: string[];
  commonCtas: string[];
  longRunningAdCount: number;
  heavyAdvertiserCount: number;
  saturationNotes: string[];
  differentiationOpportunities: string[];
  /** What scaled ads in this niche look like for engagement */
  engagementBenchmarks?: string[];
  /** Imperfections commonly present even in high-signal ads */
  toleranceSignals?: ToleranceSignal[];
  /** Compact block for agent prompts */
  summary: string;
};

export type IntelligenceBrief = {
  gatheredAt: string;
  category: string;
  platforms: string[];
  /** Tavily result: trending hooks/formats for this platform + category */
  platformTrends: string;
  /** Tavily result: competitor angles and hooks observed */
  competitorAngles: string;
  /** Tavily result: conversion patterns, offers, guarantees common in category */
  categoryConversion: string;
  /** Tavily result: unaddressed customer frustrations from Reddit/reviews */
  customerFrustrations: string;
  /** Tavily result: what content this audience watches on the target platform */
  audienceContent?: string;
  /** Tavily result: winning hooks and script patterns in this niche */
  winningScriptPatterns?: string;
  /** Tavily result: buyer psychology, objections, market sophistication */
  nicheSophistication?: string;
  /** Meta Ad Library: active competitor ads (empty if API not configured) */
  competitorAds: CompetitorAd[];
  /** Deterministic patterns from scraped ads — no extra AI call */
  marketPatterns?: MarketPatterns;
  /** Pre-computed competitive insight lines for reports/UI */
  competitiveInsights?: string[];
  /** Category tolerance calibration — which flaws winners routinely have */
  toleranceSignals?: ToleranceSignal[];
  sources: {
    tavilyEnabled: boolean;
    metaEnabled: boolean;
    apifyEnabled?: boolean;
    metaSource?: "apify" | "graph_api" | "none";
    adsFound: number;
    adsHighQuality?: number;
    searchesRun: number;
  };
};

export type VideoContext = {
  /** Full raw transcript from Whisper (may include background lyrics) */
  transcript: string;
  /** Isolated voiceover / creator speech / marketing dialogue — use for script analysis */
  primaryMessaging?: string;
  /** Background music, lyrics, trending audio, SFX — not brand copy */
  backgroundAudioNote?: string;
  /** Quoted on-screen text/captions from sampled frames */
  onScreenText?: string;
  /** False when Whisper failed, API key missing, or file too large */
  transcriptAvailable: boolean;
  /** Claude-generated description across sampled frames */
  visualDescription: string;
  /** Per-frame chronological notes when multi-frame sampling succeeded */
  visualTimeline?: string[];
  /** Approximate capture times for sampled frames */
  frameTimestamps?: string[];
  /** Number of evenly spaced frames analyzed across the video */
  frameCount: number;
  /** Seconds of video covered by visual sampling */
  analyzedDurationSec?: number;
  /** Total video duration in seconds when known */
  videoDurationSec?: number;
  /** timeline_sampling = ffmpeg frames; gemini_vertex = native full video; thumbnail_fallback = limited */
  visualAnalysisMode?: "gemini_vertex" | "timeline_sampling" | "thumbnail_fallback";
  /** Non-fatal warnings from the video processing pipeline */
  processingNotes: string[];
};

export type BrandProfileStatus =
  | "pending"
  | "processing"
  | "complete"
  | "failed"
  | "manual_required";

export type BrandProfileProgress = {
  step: string;
  message: string;
  percent: number;
};

export type BrandProfile = {
  brandName: string;
  url: string;
  /** Product category / market vertical */
  category: string;
  /** One-sentence summary */
  oneLiner: string;
  /** Core value propositions (3–5) */
  coreValuePropositions: string[];
  /** Legacy mirror of primary value prop */
  valueProposition: string;
  productsServices: string[];
  /** Detailed target customer psychographics */
  targetCustomer: string;
  /** Price tier signals observed on site */
  pricePointSignals: string;
  /** What social proof exists (reviews, logos, UGC, etc.) */
  socialProofAvailability: string;
  /** How the offer is structured (subscription, bundle, trial, etc.) */
  offerStructure: string;
  /** Brand tone / voice */
  toneOfVoice: string;
  differentiators: string[];
  pricePositioning: string;
  /** Target customer age range (e.g. "25–45") */
  targetCustomerAgeRange?: string;
  /** Key pain points the product solves */
  targetCustomerPainPoints?: string[];
  /** Key desires / outcomes the customer wants */
  targetCustomerDesires?: string[];
  /** Guarantee or risk reversal */
  offerGuarantee?: string;
  /** Key offer elements (free shipping, bundles, etc.) */
  offerKeyElements?: string[];
  /** Notable claims or results for social proof */
  notableClaims?: string[];
  /** Raw scraped text kept for agent context */
  rawScrapedContent: string;
  /** User-provided description when scrape was insufficient */
  manualDescription?: string;
  partial: boolean;
  generatedFrom: "scrape" | "url-only" | "manual";
};
