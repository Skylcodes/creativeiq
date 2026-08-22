import "server-only";

import { callClaude, CLAUDE_MODEL } from "@/lib/ai/client";
import { PERFORMANCE_EXPERT_SYSTEM, VIEWER_SYSTEM } from "@/lib/ai/pipeline-prompts";
import type { PerformanceEvaluation, ViewerEvaluation } from "@/lib/ai/pipeline-types";

const VIEWER_SUFFIX =
  "Give your honest reaction now, fully in character as the real viewer described above.";
const PERFORMANCE_SUFFIX =
  "Give your honest media-buyer evaluation now, fully in character as described above.";

export type RunEvaluatorsInput = {
  /** Shared evidence block (brand, platform, visual intelligence, landing page, market intel). */
  cachedContext: string;
};

export type RunEvaluatorsResult = {
  viewer: ViewerEvaluation;
  performanceExpert: PerformanceEvaluation;
};

/**
 * JOB 3 — two independent evaluation agents, run in parallel. Neither
 * produces a numeric score; that separation is deliberate (reduces
 * anchoring and prevents agents from picking a number and inventing
 * justification for it after the fact).
 */
export async function runEvaluators(
  input: RunEvaluatorsInput
): Promise<RunEvaluatorsResult> {
  const [viewerRaw, performanceRaw] = await Promise.all([
    callClaude({
      system: VIEWER_SYSTEM,
      cachedContext: input.cachedContext,
      prompt: VIEWER_SUFFIX,
      maxTokens: 900,
      temperature: 0.8,
    }),
    callClaude({
      system: PERFORMANCE_EXPERT_SYSTEM,
      cachedContext: input.cachedContext,
      prompt: PERFORMANCE_SUFFIX,
      maxTokens: 1300,
      temperature: 0.5,
      model: CLAUDE_MODEL,
    }),
  ]);

  return {
    viewer: { raw: viewerRaw },
    performanceExpert: { raw: performanceRaw },
  };
}
