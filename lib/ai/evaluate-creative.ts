import "server-only";
import { callClaude, callClaudeJSON, type ImageInput } from "@/lib/ai/client";
import {
  truncateLandingPageForAgents,
} from "@/lib/ai/brand-profile-prompt";
import {
  buildComparisonScopeBlock,
  buildContextBlock,
  COMPARISON_VARIANT_EXTRACTION_SYSTEM,
  DR_CRITIC_SYSTEM,
  SKEPTICAL_BUYER_SYSTEM,
} from "@/lib/ai/prompts";
import type { CreativeGoal } from "@/lib/analyses/creative-goals";
import { normalizeCreativeGoal } from "@/lib/analyses/creative-goals";
import type { ComparisonTestDimension } from "@/lib/types/comparison";

const AGENT_SUFFIX =
  "Give your analysis now, fully in character.";

const DIMENSION_LABELS: Record<ComparisonTestDimension, string> = {
  hook: "Hook / Opening",
  script_copy: "Script / Copy",
  visual_style: "Visual Style",
  cta: "CTA",
  full_creative: "Full Creative",
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export type CreativeEvaluation = {
  score: number;
  scoreBreakdown: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  improvements: string | null;
  productionNote: string | null;
  summary: string;
  rawAgents: {
    direct_response: string;
    skeptical_buyer: string;
  };
};

type RawVariantExtraction = Omit<CreativeEvaluation, "rawAgents">;

export type EvaluateCreativeInput = {
  brandProfileText: string;
  creativeText: string;
  creativeIsImage: boolean;
  creativeIsVideo?: boolean;
  creativeGoal?: CreativeGoal;
  landingPageText: string;
  landingPageStatus: "ok" | "partial" | "failed";
  platformText: string;
  intelligenceBriefText?: string;
  image?: ImageInput;
  /** When set, only DR Critic receives the image (text brief for buyer). */
  visionImage?: ImageInput;
  variantLabel: string;
  testDimensions: ComparisonTestDimension[];
};

/**
 * Shared grading path for comparison variants (and future features).
 * DR Critic + Skeptical Buyer in parallel → calibrated extraction (Haiku).
 */
export async function evaluateCreative(
  input: EvaluateCreativeInput
): Promise<CreativeEvaluation> {
  const dimensionLabels = input.testDimensions.map((d) => DIMENSION_LABELS[d]);
  const scopeBlock = buildComparisonScopeBlock(dimensionLabels, input.variantLabel);

  const agentLandingPage = truncateLandingPageForAgents(input.landingPageText);

  const context = buildContextBlock({
    brandProfileText: input.brandProfileText,
    creativeText: input.creativeText,
    creativeIsImage: input.creativeIsImage,
    creativeIsVideo: input.creativeIsVideo ?? false,
    creativeGoal: normalizeCreativeGoal(input.creativeGoal),
    landingPageText: agentLandingPage,
    landingPageStatus: input.landingPageStatus,
    platformText: input.platformText,
    intelligenceBriefText: input.intelligenceBriefText,
  });

  const scopedSuffix = [
    scopeBlock,
    "",
    AGENT_SUFFIX,
  ].join("\n");

  const [drCritic, skepticalBuyer] = await Promise.all([
    callClaude({
      system: DR_CRITIC_SYSTEM,
      cachedContext: context,
      prompt: scopedSuffix,
      image: input.visionImage ?? input.image,
      maxTokens: 1400,
      temperature: 0.8,
    }),
    callClaude({
      system: SKEPTICAL_BUYER_SYSTEM,
      cachedContext: context,
      prompt: scopedSuffix,
      maxTokens: 1400,
      temperature: 0.8,
    }),
  ]);

  const raw = await callClaudeJSON<RawVariantExtraction>({
    system: COMPARISON_VARIANT_EXTRACTION_SYSTEM,
    cachedContext: context,
    prompt: [
      scopeBlock,
      "",
      "TEST DIMENSIONS:",
      dimensionLabels.join(", "),
      "",
      "=== AGENT — THE DIRECT RESPONSE CRITIC ===",
      drCritic,
      "",
      "=== AGENT — THE SKEPTICAL BUYER ===",
      skepticalBuyer,
      "",
      "Produce the structured JSON now. Score must reflect agent consensus and SCORE_CALIBRATION. Only critical buying blockers should significantly lower score — optimizations are recommendations, not score destroyers. Grade HOW this variant executes its angle — never dock for omitted product features.",
    ].join("\n"),
    maxTokens: 2000,
    temperature: 0.6,
    grading: true,
  });

  return {
    score: clamp(raw.score ?? 0, 0, 100),
    scoreBreakdown: raw.scoreBreakdown ?? {},
    strengths: raw.strengths ?? [],
    weaknesses: raw.weaknesses ?? [],
    improvements: raw.improvements ?? null,
    productionNote: raw.productionNote ?? null,
    summary: raw.summary ?? "",
    rawAgents: {
      direct_response: drCritic,
      skeptical_buyer: skepticalBuyer,
    },
  };
}
