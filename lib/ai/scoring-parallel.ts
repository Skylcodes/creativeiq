import "server-only";

import { callClaudeJSON, CLAUDE_MODEL } from "@/lib/ai/client";
import { collectSuccessfulResults } from "@/lib/ai/gemini-rating-ensemble";
import { SCORING_SYSTEM } from "@/lib/ai/pipeline-prompts";
import { logWorkerStage } from "@/lib/analyses/worker-reliability";

/**
 * Job 4 is one huge JSON object (~152s at 8192 tokens). Split into three
 * independent generations that share the unchanged SCORING_SYSTEM / model /
 * temperature. Numeric grades come only from the grades call; the other two
 * fill qualitative fields. Wall time is ~max(sub-calls), not the sum.
 */
export const SCORING_GRADE_KEYS = [
  "scrollStopScore",
  "watchThroughScore",
  "retentionScore",
  "headline",
  "verdictRationale",
  "scrollStopEvidence",
  "watchThroughEvidence",
  "retentionRationale",
  "landingPageCategories",
  "angleTags",
] as const;

export const SCORING_INSIGHT_KEYS = [
  "topFindings",
  "priorityActions",
  "agentFindings",
  "competitiveInsights",
] as const;

export const SCORING_CREATIVE_KEYS = [
  "angleRecommendations",
  "hookVariants",
  "scriptRewrite",
  "icpSimulation",
] as const;

const GRADES_MAX_TOKENS = 3072;
const INSIGHTS_MAX_TOKENS = 3072;
const CREATIVE_MAX_TOKENS = 4096;

/** Tight enough that one retry still fits the worker's remaining budget. */
const GRADES_TIMEOUT_MS = 80_000;
const INSIGHTS_TIMEOUT_MS = 80_000;
const CREATIVE_TIMEOUT_MS = 100_000;

export type ScoringParallelInput = {
  cachedContext: string;
  prompt: string;
  analysisId?: string;
};

export function pickDefinedKeys(
  raw: unknown,
  keys: readonly string[]
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (obj[key] !== undefined) out[key] = obj[key];
  }
  return out;
}

export function mergeScoringPartials(
  parts: Array<Record<string, unknown>>
): Record<string, unknown> {
  return Object.assign({}, ...parts);
}

function fieldsOnlyInstruction(keys: readonly string[]): string {
  return [
    "Output the JSON object using ONLY these keys from the schema (omit every other key):",
    keys.join(", ") + ".",
    "Do not change scoring rules, weights, or evidence standards — only restrict which keys you emit.",
  ].join(" ");
}

async function scoringSubcall(
  stage: string,
  analysisId: string,
  input: ScoringParallelInput,
  keys: readonly string[],
  maxTokens: number,
  timeoutMs: number
): Promise<unknown> {
  return logWorkerStage(stage, analysisId, () =>
    callClaudeJSON<unknown>({
      system: SCORING_SYSTEM,
      cachedContext: input.cachedContext,
      prompt: `${input.prompt}\n\n${fieldsOnlyInstruction(keys)}`,
      maxTokens,
      temperature: 0.2,
      model: CLAUDE_MODEL,
      grading: true,
      timeoutMs,
    })
  );
}

/**
 * Launch the three Job 4 sub-calls in parallel. Grades are required (same
 * failure mode as the previous single call). Insights/creative may fail;
 * validateScoringRaw already synthesizes those fields from evaluator
 * transcripts and other fallbacks.
 */
export async function runParallelScoringCalls(
  input: ScoringParallelInput
): Promise<Record<string, unknown>> {
  const analysisId = input.analysisId ?? "scoring";
  const t0 = Date.now();

  const settled = await Promise.allSettled([
    scoringSubcall(
      "scoring.grades",
      analysisId,
      input,
      SCORING_GRADE_KEYS,
      GRADES_MAX_TOKENS,
      GRADES_TIMEOUT_MS
    ),
    scoringSubcall(
      "scoring.insights",
      analysisId,
      input,
      SCORING_INSIGHT_KEYS,
      INSIGHTS_MAX_TOKENS,
      INSIGHTS_TIMEOUT_MS
    ),
    scoringSubcall(
      "scoring.creative",
      analysisId,
      input,
      SCORING_CREATIVE_KEYS,
      CREATIVE_MAX_TOKENS,
      CREATIVE_TIMEOUT_MS
    ),
  ]);

  const { succeeded, firstError } = collectSuccessfulResults(settled);
  const grades = settled[0];
  const insights = settled[1];
  const creative = settled[2];

  console.log(
    `[worker] scoring.parallel ${Date.now() - t0}ms used=${succeeded.length}/3 grades=${grades.status} insights=${insights.status} creative=${creative.status} ${analysisId}`
  );

  if (grades.status === "rejected") {
    throw grades.reason instanceof Error
      ? grades.reason
      : firstError instanceof Error
        ? firstError
        : new Error("Scoring grades call failed.");
  }

  return mergeScoringPartials([
    pickDefinedKeys(grades.value, SCORING_GRADE_KEYS),
    insights.status === "fulfilled"
      ? pickDefinedKeys(insights.value, SCORING_INSIGHT_KEYS)
      : {},
    creative.status === "fulfilled"
      ? pickDefinedKeys(creative.value, SCORING_CREATIVE_KEYS)
      : {},
  ]);
}
