import { callClaude, callClaudeJSON, CLAUDE_JSON_MODEL, type ImageInput } from "@/lib/ai/client";
import { truncateLandingPageForAgents } from "@/lib/ai/brand-profile-prompt";
import {
  buildContextBlock,
  DR_CRITIC_SYSTEM,
  FUNNEL_REPORT_SYSTEM,
  SKEPTICAL_BUYER_SYSTEM,
} from "@/lib/ai/prompts";
import { getCreativeGoalScoringBlock, normalizeCreativeGoal } from "@/lib/analyses/creative-goals";
import type { CreativeGoal } from "@/lib/analyses/creative-goals";
import { extractDrRewriteSeed } from "@/lib/report/script-rewrite";
import type {
  AnalysisReport,
  ConversionCategory,
  CriteriaSeverityTier,
  IcpSimulation,
} from "@/lib/types/report";

const AGENT_SUFFIX = "Give your analysis now, fully in character.";

const STATIC_IMAGE_AGENT_SUFFIX =
  "Give your analysis now, fully in character. This is a STATIC IMAGE ad (not video). Grade thumb-stop and in-frame copy — do NOT apply video watch-time, motion, pacing, or 'competing against video' logic.";

export const STATIC_IMAGE_SYNTHESIS_INSTRUCTIONS = [
  "19. STATIC IMAGE: The creative is a static image — retentionScore = thumb-stop / scroll-stop in the feed, NOT video watch time. Do NOT create blockers or low scores because the ad is still vs video. Benchmark against static feed ads. scriptRewrite may be a static frame concept; production note should describe layout, not a talking-head timeline.",
].join("\n");

export const FUNNEL_SYNTHESIS_INSTRUCTIONS = [
  "1. Grade creative strength through the CREATIVE GOAL lens in context — not generic conversion-first unless goal is drive_purchases.",
  "2. scriptRewrite MUST be a complete spoken script (80+ words): hook → body → proof → offer → CTA, THEN a final line starting with 'Production note:'. NEVER output only a production note — that field is INVALID without the full script above it. Extend the DR Critic REWRITE section when present.",
  "3. agentFindings: EXACTLY 2 entries (skeptical_buyer, direct_response) — quote THIS ad; 3+ keyFindings each.",
  "4. CHECKLIST PHASE A then PHASE B: complete criteriaChecklist mechanically first; topBlockers/priorityActions only from critical/moderate failures — no required minimum count.",
  "5. SCORING: Output strategicScore and retentionScore only — do NOT output creativeStrengthScore (computed in application code). retentionScore = organic-post / thumb-stop test. strategicScore = messaging quality.",
  "6. Never lower scores because this ad omitted product features outside its chosen angle.",
  "7. AUDIENCE: If the ad targets a valid buyer who could purchase this product — even when the landing page hero copy describes a different entry-point persona — do NOT penalize, block, or call it 'wrong audience'.",
  "8. RELEVANCE: Missing data proof, hard CTA, or LP angle mirroring is not a flaw unless this ad's goal required it and the absence creates specific harm.",
  "9. ICP personas: simulate plausible product buyers reacting honestly — not landing-page demographic clones.",
  "10. VIDEO: If creative is video, analyze ONLY primary ad messaging + on-screen text — never song lyrics or background audio as brand copy.",
  "11. retentionVerdict: when strategic and retention differ 15+ points, describe the actual gap using your two score values.",
  "12. SEVERITY: classify each pass=false as critical/moderate/minor using FLAW_SEVERITY_RULES — severity drives score weight, not fail count.",
  "13. META-CRITIQUE: If the ad shows a reference clip/ad on screen while VO critiques/reacts, viewers understand the format — do NOT block or score down for 'whose ad is this'.",
  "14. GEMINI GROUND TRUTH: When a VIDEO VISUAL ANALYSIS (Gemini) section is present, retentionScore and all visual/pacing/on-screen-text claims MUST be consistent with it. Never invent timing (flash, only once, drop-off) that contradicts Gemini's timeline.",
].join("\n");

export type FunnelGradingInput = {
  brandProfileText: string;
  creativeText: string;
  creativeIsImage: boolean;
  creativeIsVideo: boolean;
  creativeGoal?: CreativeGoal;
  landingPageText: string;
  landingPageStatus: "ok" | "partial" | "failed";
  platformText: string;
  intelligenceBriefText?: string;
  criteriaText?: string;
  visionImage?: ImageInput;
  /** Gemini full-video ground truth for retention/visual grading */
  geminiVisualContext?: string;
};

export type FunnelReportRaw = {
  conversionCategories: ConversionCategory[];
  verdictSummary: string;
  headline: string;
  /** Computed in application code from strategicScore + retentionScore — not model output. */
  creativeStrengthScore?: number;
  strategicScore?: number;
  retentionScore?: number;
  retentionVerdict?: string;
  angleTags: AnalysisReport["angleTags"];
  agentFindings: AnalysisReport["agentFindings"];
  angleRecommendations: AnalysisReport["angleRecommendations"];
  topBlockers: AnalysisReport["topBlockers"];
  hookVariants: AnalysisReport["hookVariants"];
  scriptRewrite: string;
  priorityActions: AnalysisReport["priorityActions"];
  criteriaChecklist?: {
    id: string;
    pass: boolean | null;
    note: string;
    severity?: CriteriaSeverityTier;
  }[];
  icpSimulation?: IcpSimulation;
  competitiveInsights?: string[];
};

export type FunnelGradingResult = {
  report: FunnelReportRaw;
  buyer: string;
  drCritic: string;
  drRewriteSeed: string;
};

function buildFunnelSynthesisPrompt(
  buyer: string,
  drCritic: string,
  drRewriteSeed: string,
  goalScoringBlock: string,
  creativeIsImage: boolean
): string {
  return [
    "=== AGENT — THE SKEPTICAL BUYER ===",
    buyer,
    "",
    "=== AGENT — THE DIRECT RESPONSE CRITIC ===",
    drCritic,
    "",
    ...(drRewriteSeed
      ? [
          "=== DR CRITIC SCRIPT SEED (extend this — do NOT replace with generic copy) ===",
          drRewriteSeed.slice(0, 1200),
          "",
        ]
      : []),
    "GOAL-SPECIFIC SCORING (conversionCategories + strategicScore/retentionScore):",
    goalScoringBlock,
    "",
    "SYNTHESIS INSTRUCTIONS:",
    FUNNEL_SYNTHESIS_INSTRUCTIONS,
    ...(creativeIsImage ? ["", STATIC_IMAGE_SYNTHESIS_INSTRUCTIONS] : []),
    "",
    "Produce the complete funnel report JSON now.",
  ].join("\n");
}

/** Shared funnel grading: same agents + FUNNEL_REPORT_SYSTEM synthesis as standalone analysis. */
export async function runFunnelGrading(
  input: FunnelGradingInput
): Promise<FunnelGradingResult> {
  const creativeGoal = normalizeCreativeGoal(input.creativeGoal);
  const agentLandingPageText = truncateLandingPageForAgents(input.landingPageText);
  const goalScoringBlock = getCreativeGoalScoringBlock(creativeGoal);

  const agentContext = buildContextBlock({
    brandProfileText: input.brandProfileText,
    creativeText: input.creativeText,
    creativeIsImage: input.creativeIsImage,
    creativeIsVideo: input.creativeIsVideo,
    creativeGoal,
    landingPageText: agentLandingPageText,
    landingPageStatus: input.landingPageStatus,
    platformText: input.platformText,
    intelligenceBriefText: input.intelligenceBriefText,
    criteriaText: input.criteriaText,
    geminiVisualContext: input.geminiVisualContext,
  });

  const gradingContext = buildContextBlock({
    brandProfileText: input.brandProfileText,
    creativeText: input.creativeText,
    creativeIsImage: input.creativeIsImage,
    creativeIsVideo: input.creativeIsVideo,
    creativeGoal,
    landingPageText: input.landingPageText,
    landingPageStatus: input.landingPageStatus,
    platformText: input.platformText,
    intelligenceBriefText: input.intelligenceBriefText,
    criteriaText: input.criteriaText,
    geminiVisualContext: input.geminiVisualContext,
  });

  const agentImage =
    input.creativeIsImage || input.creativeIsVideo
      ? input.visionImage
      : undefined;

  const agentSuffix = input.creativeIsImage
    ? STATIC_IMAGE_AGENT_SUFFIX
    : AGENT_SUFFIX;

  const [buyer, drCritic] = await Promise.all([
    callClaude({
      system: SKEPTICAL_BUYER_SYSTEM,
      cachedContext: agentContext,
      prompt: agentSuffix,
      maxTokens: 1100,
      temperature: 0.8,
      model: CLAUDE_JSON_MODEL,
    }),
    callClaude({
      system: DR_CRITIC_SYSTEM,
      cachedContext: agentContext,
      prompt: agentSuffix,
      image: agentImage,
      maxTokens: 1700,
      temperature: 0.8,
    }),
  ]);

  const drRewriteSeed = extractDrRewriteSeed(drCritic);

  const report = await callClaudeJSON<FunnelReportRaw>({
    system: FUNNEL_REPORT_SYSTEM,
    cachedContext: gradingContext,
    prompt: buildFunnelSynthesisPrompt(
      buyer,
      drCritic,
      drRewriteSeed,
      goalScoringBlock,
      input.creativeIsImage
    ),
    maxTokens: 7168,
    temperature: 0.2,
    grading: true,
  });

  return { report, buyer, drCritic, drRewriteSeed };
}
