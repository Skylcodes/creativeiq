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
  IcpSimulation,
} from "@/lib/types/report";

const AGENT_SUFFIX = "Give your analysis now, fully in character.";

export const FUNNEL_SYNTHESIS_INSTRUCTIONS = [
  "1. Grade creative strength through the CREATIVE GOAL lens in context — not generic conversion-first unless goal is drive_purchases.",
  "2. scriptRewrite MUST be a complete spoken script (80+ words): hook → body → proof → offer → CTA, THEN a final line starting with 'Production note:'. NEVER output only a production note — that field is INVALID without the full script above it. Extend the DR Critic REWRITE section when present.",
  "3. agentFindings: EXACTLY 2 entries (skeptical_buyer, direct_response) — quote THIS ad; 3+ keyFindings each.",
  "4. priorityActions: 3-5 only when each has a real mechanism of harm or clear upside; full strategic breakdown on every item.",
  "5. SCORING: Ask 'would this flaw stop or create doubt in a buyer?' before reducing scores. Optimizations (weaker hook, more proof, better visuals) belong in recommendations — only critical conversion problems should significantly lower scores. Multiple small improvements must NOT produce a failing score.",
  "6. Never lower scores because this ad omitted product features outside its chosen angle.",
  "7. AUDIENCE: If the ad targets a valid buyer who could purchase this product — even when the landing page hero copy describes a different entry-point persona — do NOT penalize, block, or call it 'wrong audience'. Different ad/LP entry points are normal DTC strategy.",
  "8. IN-AD PRICE: Whether the ad mentions price is irrelevant to creative quality — never score down, block, or criticize for omitting price. Only flag price when the ad explicitly promised a specific deal and failed to state it.",
  "9. IN-AD SOCIAL PROOF: Testimonials, review counts, and stat stacks in the ad are not required — LP handles trust. Missing LP social proof = recommend adding it + light funnel deduction only, never a major penalty or blocker.",
  "10. RELEVANCE: Missing data proof, hard CTA, or LP angle mirroring is not a flaw unless this ad's goal required it and the absence creates specific harm.",
  "11. COMMON HOOKS: Do not penalize familiar TikTok/Reels openers — judge whether the hook works, not whether viewers have seen the format before.",
  "12. ICP personas: simulate plausible product buyers reacting honestly — not landing-page demographic clones.",
  "13. VIDEO: If creative is video, analyze ONLY primary ad messaging + on-screen text — never song lyrics or background audio as brand copy.",
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
};

export type FunnelReportRaw = {
  conversionCategories: ConversionCategory[];
  verdictSummary: string;
  headline: string;
  creativeStrengthScore: number;
  angleTags: AnalysisReport["angleTags"];
  agentFindings: AnalysisReport["agentFindings"];
  angleRecommendations: AnalysisReport["angleRecommendations"];
  topBlockers: AnalysisReport["topBlockers"];
  hookVariants: AnalysisReport["hookVariants"];
  scriptRewrite: string;
  priorityActions: AnalysisReport["priorityActions"];
  criteriaChecklist?: { id: string; pass: boolean | null; note: string }[];
  icpSimulation?: IcpSimulation;
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
  goalScoringBlock: string
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
    "GOAL-SPECIFIC SCORING (conversionCategories + creativeStrengthScore):",
    goalScoringBlock,
    "",
    "SYNTHESIS INSTRUCTIONS:",
    FUNNEL_SYNTHESIS_INSTRUCTIONS,
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
  });

  const agentImage = input.creativeIsImage ? undefined : input.visionImage;

  const [buyer, drCritic] = await Promise.all([
    callClaude({
      system: SKEPTICAL_BUYER_SYSTEM,
      cachedContext: agentContext,
      prompt: AGENT_SUFFIX,
      maxTokens: 1100,
      temperature: 0.8,
      model: CLAUDE_JSON_MODEL,
    }),
    callClaude({
      system: DR_CRITIC_SYSTEM,
      cachedContext: agentContext,
      prompt: AGENT_SUFFIX,
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
      goalScoringBlock
    ),
    maxTokens: 6144,
    temperature: 0.2,
    grading: true,
  });

  return { report, buyer, drCritic, drRewriteSeed };
}
