import type { ImageInput } from "@/lib/ai/client";
import type { VideoCreativeContext } from "@/lib/ai/video";
import type {
  AgentFinding,
  AngleRecommendation,
  AngleTag,
  ConversionBlocker,
  ConversionCategory,
  ConversionCategoryKey,
  HookVariant,
  IcpSimulation,
  IntelligenceBrief,
  PriorityAction,
  Verdict,
} from "@/lib/types/report";

export type CreativeKind = "image" | "script" | "video-placeholder" | "video";

/**
 * JOB 1 output — Gemini/vision observation of the creative. Purely factual:
 * what happens, not whether it's good. `briefText` is the fully formatted
 * block already fed to Job 3/4 prompts (reuses existing video/image brief
 * builders so no extra model calls are introduced).
 */
export type VisualIntelligence = {
  kind: CreativeKind;
  briefText: string;
  /** Gemini raw 0-10 cold scroll-stop signal — video only, supporting evidence for Job 4. */
  coldScrollStopScore?: number;
  /** Gemini raw 0-10 watch-through signal — video only, supporting evidence for Job 4. */
  watchThroughScore?: number;
  dropOffMoments?: string[];
  /** Non-fatal degradation notes (e.g. "video unavailable", "Gemini not configured"). */
  sourceNotes: string[];
  videoContext?: VideoCreativeContext;
  /** Attach for evaluator/scoring vision calls when creative is a static image. */
  visionImage?: ImageInput;
};

/**
 * JOB 2 output — market context from Tavily + Meta Ad Library. `degraded` is
 * true when research could not be gathered, so downstream jobs know to avoid
 * fabricating market claims.
 */
export type MarketIntelligenceResult = {
  brief: IntelligenceBrief | null;
  briefText?: string;
  degraded: boolean;
};

/** JOB 3A — Real Viewer. No scores, no marketing framework — first-person prose only. */
export type ViewerEvaluation = {
  raw: string;
};

/** JOB 3B — Performance Expert. No scores — narrative funding decision only. */
export type PerformanceEvaluation = {
  raw: string;
};

export const LANDING_PAGE_CATEGORY_DEFS: {
  key: ConversionCategoryKey;
  label: string;
  maxScore: number;
}[] = [
  { key: "message_match", label: "Message Match", maxScore: 20 },
  { key: "above_fold_clarity", label: "Above-Fold Clarity", maxScore: 15 },
  { key: "social_proof", label: "Social Proof", maxScore: 8 },
  { key: "offer_clarity", label: "Offer Clarity", maxScore: 15 },
  { key: "objection_handling", label: "Objection Handling", maxScore: 17 },
  { key: "visual_ux", label: "Visual / UX Quality", maxScore: 10 },
  { key: "funnel_continuity", label: "Funnel Continuity", maxScore: 15 },
];

/** JOB 4 raw model output — before deterministic composites are computed. */
export type ScoringRaw = {
  /** 0-50 — would a cold viewer stop in the first 1-3 seconds. */
  scrollStopScore: number;
  scrollStopEvidence?: string;
  /** 0-50 — for viewers who stop, does interest/message hold through the payoff. */
  watchThroughScore: number;
  watchThroughEvidence?: string;
  /** 0-100 — independent metric: would a real viewer keep watching rather than scroll away. */
  retentionScore: number;
  retentionRationale?: string;
  landingPageCategories: ConversionCategory[];
  headline: string;
  angleTags: AngleTag[];
  /** Exactly 2 entries: real_viewer, performance_expert. */
  agentFindings: AgentFinding[];
  /** Max 3 — [] is valid. */
  topFindings: ConversionBlocker[];
  /** Max 3. */
  priorityActions: PriorityAction[];
  /** 3 ranked alternatives. */
  angleRecommendations: AngleRecommendation[];
  /** 3-5 alternatives. */
  hookVariants: HookVariant[];
  /** 80+ words spoken script + final "Production note:" line. */
  scriptRewrite: string;
  icpSimulation?: IcpSimulation;
  competitiveInsights?: string[];
  /** Max 25 words, one sentence, specific to this ad. */
  verdictRationale: string;
};

/** JOB 4/5 final result — composites computed deterministically in application code. */
export type ScoringResult = ScoringRaw & {
  /** scrollStopScore + watchThroughScore, clamped 0-100. Computed, never model output. */
  creativeStrengthScore: number;
  /** Sum of landingPageCategories, clamped 0-100. Computed, never model output. */
  landingPageTotal: number;
  /** (creativeStrengthScore * 0.55) + (landingPageTotal * 0.45), rounded. Computed, never model output. */
  overallFunnelScore: number;
  /** Derived from overallFunnelScore band. Computed, never model output. */
  verdict: Verdict;
};
