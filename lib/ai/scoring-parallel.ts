import "server-only";

import { callClaudeJSON, CLAUDE_MODEL } from "@/lib/ai/client";
import { collectSuccessfulResults } from "@/lib/ai/gemini-rating-ensemble";
import { SCORING_SYSTEM } from "@/lib/ai/pipeline-prompts";
import { logWorkerStage } from "@/lib/analyses/worker-reliability";
import { isValidScriptRewrite } from "@/lib/report/script-rewrite";

/**
 * Job 4 is one huge JSON object (~152s at 8192 tokens). Split into three
 * independent generations that share the unchanged SCORING_SYSTEM / model /
 * temperature. Numeric grades come only from the grades call; the other two
 * fill qualitative fields. Wall time is ~max(sub-calls), not the sum.
 *
 * The creative call used to inherit the full "critical fields first" schema
 * and a 4096-token cap, so it spent the budget on scores/LP and truncated
 * hooks/script. Each sub-call now gets the original field instructions + the
 * original schema subset for its keys, and creative gets the original 8192
 * output budget.
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
/** Same output budget as the original single Job 4 call. */
export const CREATIVE_MAX_TOKENS = 8192;

export const CREATIVE_MIN_HOOKS = 3;
export const CREATIVE_MIN_ANGLES = 2;

/** Tight enough that one retry still fits the worker's remaining budget. */
const GRADES_TIMEOUT_MS = 80_000;
const INSIGHTS_TIMEOUT_MS = 80_000;
const CREATIVE_TIMEOUT_MS = 120_000;

export type ScoringParallelInput = {
  cachedContext: string;
  prompt: string;
  analysisId?: string;
};

export type CreativeValidation = {
  ok: boolean;
  reasons: string[];
  hookCount: number;
  angleCount: number;
};

/**
 * Grader-analysis leaks that showed up in production as scriptRewrite
 * (e.g. "The sell-out claim at ~0:37 —") instead of a spoken rewrite.
 */
const GRADER_ANALYSIS_LEAK_RE =
  /~\d+:\d+|sell-out claim|scroll-?stop|watch-through quality|retentionScore|would a (?:cold )?viewer|drop-off moment/i;

export function extractScoringSection(startMarker: string, endMarker: string): string {
  const start = SCORING_SYSTEM.indexOf(startMarker);
  const end = SCORING_SYSTEM.indexOf(endMarker, start + startMarker.length);
  if (start === -1 || end === -1) {
    throw new Error(
      `SCORING_SYSTEM missing section "${startMarker}" … "${endMarker}"`
    );
  }
  return SCORING_SYSTEM.slice(start, end).trim();
}

/** Verbatim original field instructions for the creative-deliverable keys. */
export function originalCreativeFieldInstructions(): string {
  return extractScoringSection("ANGLE RECOMMENDATIONS —", "VERDICT RATIONALE —");
}

export function originalGradesFieldInstructions(): string {
  return [
    extractScoringSection("CREATIVE STRENGTH —", "TOP FINDINGS —"),
    extractScoringSection("VERDICT RATIONALE —", "COMPETITIVE INSIGHTS —"),
  ].join("\n\n");
}

export function originalInsightsFieldInstructions(): string {
  return [
    extractScoringSection("TOP FINDINGS —", "ANGLE RECOMMENDATIONS —"),
    extractScoringSection("COMPETITIVE INSIGHTS —", "PRE-OUTPUT MANDATORY CHECK"),
  ].join("\n\n");
}

/** Original schema lines for these keys — copied from SCORING_SYSTEM, not rewritten. */
export function originalSchemaSubset(keys: readonly string[]): string {
  const returnIdx = SCORING_SYSTEM.indexOf("Return ONLY JSON");
  const brace = SCORING_SYSTEM.indexOf("{", returnIdx);
  const close = SCORING_SYSTEM.indexOf("\n}\n", brace);
  if (brace === -1 || close === -1) {
    throw new Error("SCORING_SYSTEM missing JSON schema block.");
  }
  const block = SCORING_SYSTEM.slice(brace + 1, close);
  const lines = block.split("\n");
  const kept: string[] = [];
  let capturing = false;
  let depth = 0;

  for (const line of lines) {
    const keyMatch = line.match(/^\s*"([A-Za-z]+)"\s*:/);
    if (keyMatch && depth === 0) {
      capturing = keys.includes(keyMatch[1]);
    }
    if (!capturing) continue;
    kept.push(line);
    depth += (line.match(/[\[{]/g) ?? []).length;
    depth -= (line.match(/[\]}]/g) ?? []).length;
    if (depth <= 0) {
      capturing = false;
      depth = 0;
    }
  }

  const body = kept
    .join("\n")
    .replace(/,(\s*)$/, "$1")
    .trim();
  return `{\n${body}\n}`;
}

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

export function countFilledHooks(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const hooks = (raw as { hookVariants?: unknown }).hookVariants;
  if (!Array.isArray(hooks)) return 0;
  return hooks.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const hook = (item as { hook?: unknown }).hook;
    return typeof hook === "string" && hook.trim().length > 0;
  }).length;
}

export function countFilledAngles(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const angles = (raw as { angleRecommendations?: unknown }).angleRecommendations;
  if (!Array.isArray(angles)) return 0;
  return angles.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const angle = (item as { angle?: unknown }).angle;
    return typeof angle === "string" && angle.trim().length > 0;
  }).length;
}

function looksLikeGraderAnalysis(script: string): boolean {
  return GRADER_ANALYSIS_LEAK_RE.test(script);
}

export function evaluateCreativeOutput(raw: unknown): CreativeValidation {
  const reasons: string[] = [];
  const hookCount = countFilledHooks(raw);
  const angleCount = countFilledAngles(raw);

  if (hookCount < CREATIVE_MIN_HOOKS) {
    reasons.push(`hookVariants ${hookCount} < ${CREATIVE_MIN_HOOKS}`);
  }
  if (angleCount < CREATIVE_MIN_ANGLES) {
    reasons.push(`angleRecommendations ${angleCount} < ${CREATIVE_MIN_ANGLES}`);
  }

  const script =
    raw && typeof raw === "object"
      ? (raw as { scriptRewrite?: unknown }).scriptRewrite
      : undefined;
  if (typeof script !== "string" || !script.trim()) {
    reasons.push("scriptRewrite missing");
  } else if (!isValidScriptRewrite(script) || looksLikeGraderAnalysis(script)) {
    reasons.push("scriptRewrite is analysis/truncated, not a spoken script");
  }

  return { ok: reasons.length === 0, reasons, hookCount, angleCount };
}

export function logScoringFallback(analysisId: string, detail: string): void {
  console.warn(`[worker] scoring fallback: ${detail} ${analysisId}`);
}

function fieldsPrompt(instructions: string, keys: readonly string[]): string {
  return [
    instructions,
    "",
    "Return ONLY JSON with exactly these keys from the original schema (omit every other key — do not emit scores, findings, or landing-page fields unless they are listed):",
    originalSchemaSubset(keys),
  ].join("\n");
}

async function scoringSubcall(
  stage: string,
  analysisId: string,
  input: ScoringParallelInput,
  keys: readonly string[],
  instructions: string,
  maxTokens: number,
  timeoutMs: number
): Promise<unknown> {
  return logWorkerStage(stage, analysisId, () =>
    callClaudeJSON<unknown>({
      system: SCORING_SYSTEM,
      cachedContext: input.cachedContext,
      prompt: `${input.prompt}\n\n${fieldsPrompt(instructions, keys)}`,
      maxTokens,
      temperature: 0.2,
      model: CLAUDE_MODEL,
      grading: true,
      timeoutMs,
    })
  );
}

async function scoringCreativeCall(
  analysisId: string,
  input: ScoringParallelInput
): Promise<unknown> {
  const run = () =>
    scoringSubcall(
      "scoring.creative",
      analysisId,
      input,
      SCORING_CREATIVE_KEYS,
      originalCreativeFieldInstructions(),
      CREATIVE_MAX_TOKENS,
      CREATIVE_TIMEOUT_MS
    );

  const first = await run();
  const firstCheck = evaluateCreativeOutput(first);
  if (firstCheck.ok) return first;

  console.warn(
    `[worker] scoring.creative invalid, retrying once: ${firstCheck.reasons.join("; ")} ${analysisId}`
  );

  const second = await run();
  const secondCheck = evaluateCreativeOutput(second);
  if (secondCheck.ok) return second;

  logScoringFallback(
    analysisId,
    `creative output invalid after retry (${secondCheck.reasons.join("; ")})`
  );
  throw new Error(
    `Creative output invalid after retry: ${secondCheck.reasons.join("; ")}`
  );
}

/**
 * Launch the three Job 4 sub-calls in parallel. Grades are required (same
 * failure mode as the previous single call). Insights/creative may fail;
 * validateScoringRaw already synthesizes those fields from evaluator
 * transcripts and other fallbacks — any such fallback is logged.
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
      originalGradesFieldInstructions(),
      GRADES_MAX_TOKENS,
      GRADES_TIMEOUT_MS
    ),
    scoringSubcall(
      "scoring.insights",
      analysisId,
      input,
      SCORING_INSIGHT_KEYS,
      originalInsightsFieldInstructions(),
      INSIGHTS_MAX_TOKENS,
      INSIGHTS_TIMEOUT_MS
    ),
    scoringCreativeCall(analysisId, input),
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

  if (insights.status === "rejected") {
    logScoringFallback(analysisId, "insights call failed — using transcript fallbacks");
  }
  if (creative.status === "rejected") {
    logScoringFallback(
      analysisId,
      "creative call failed — hooks/angles/script will use fallbacks"
    );
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
