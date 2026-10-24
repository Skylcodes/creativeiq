import "server-only";

import {
  addClaudeUsage,
  callClaudeJSON,
  CLAUDE_MODEL,
  emptyClaudeUsage,
  formatClaudeUsage,
  totalInputTokens,
  type ClaudeUsageTotals,
} from "@/lib/ai/client";
import { collectSuccessfulResults } from "@/lib/ai/gemini-rating-ensemble";
import { SCORING_SYSTEM } from "@/lib/ai/pipeline-prompts";
import { logWorkerStage } from "@/lib/analyses/worker-reliability";
import { isValidScriptRewrite } from "@/lib/report/script-rewrite";

/**
 * Job 4 used to be one huge JSON object (~152s at 8192 tokens), then a
 * single creative call (hooks+angles+script+icp at 8192 / 120s). Preview
 * retests on dpl_CRSYw9Mh showed that creative call dying at 71.8s / 72.0s
 * (success took 80.5s) with `scoring fallback: creative call failed` and no
 * retry/validation logs.
 *
 * Cause: scoringCreativeCall awaited the first run with no try/catch, so a
 * thrown API/parse error skipped validation+retry and the fallback log
 * omitted the error. That is not a hard 72s abort — the successful run
 * finished at 80.5s, and withDeadline does not cancel in-flight work.
 * callClaude already retried internally, which hid the reason and consumed
 * the 120s budget without our layer seeing it.
 *
 * Split: hooks+angles vs scriptRewrite+icp, each well under 60s, launched
 * with grades/insights (4-way). Each sub-call owns one retry via retryOnce
 * (callClaude retry disabled so they do not stack). Timeouts stay short
 * enough that one retry still fits the 270s worker budget:
 * visual ~60 + eval ~35 + max(subcall+retry) ~140 ≈ 235s.
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

export const SCORING_HOOK_ANGLE_KEYS = [
  "angleRecommendations",
  "hookVariants",
] as const;

export const SCORING_SCRIPT_ICP_KEYS = [
  "scriptRewrite",
  "icpSimulation",
] as const;

export const SCORING_CREATIVE_KEYS = [
  ...SCORING_HOOK_ANGLE_KEYS,
  ...SCORING_SCRIPT_ICP_KEYS,
] as const;

const GRADES_MAX_TOKENS = 3072;
/** Insights (3 actions + 2+ blockers + agent findings) was clipping at 3072. */
export const INSIGHTS_MAX_TOKENS = 4096;
export const HOOK_ANGLE_MAX_TOKENS = 3072;
export const SCRIPT_ICP_MAX_TOKENS = 4096;

export const CREATIVE_MIN_HOOKS = 3;
export const CREATIVE_MIN_ANGLES = 2;
export const INSIGHTS_MIN_ACTIONS = 3;
export const INSIGHTS_MIN_BLOCKERS = 2;
/** GOOD AD PROTECTION: old single Job 4 capped findings/actions at 2 when ≥80. */
export const INSIGHTS_STRONG_AD_SCORE_SUM = 80;

/** Tight enough that one retry still fits the worker's remaining budget. */
const GRADES_TIMEOUT_MS = 80_000;
const INSIGHTS_TIMEOUT_MS = 80_000;
export const HOOK_ANGLE_TIMEOUT_MS = 70_000;
export const SCRIPT_ICP_TIMEOUT_MS = 70_000;

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

export type InsightsValidation = {
  ok: boolean;
  reasons: string[];
  actionCount: number;
  blockerCount: number;
  minActions: number;
  minBlockers: number;
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

export function originalHookAngleInstructions(): string {
  return extractScoringSection("ANGLE RECOMMENDATIONS —", "SCRIPT REWRITE —");
}

export function originalScriptIcpInstructions(): string {
  return extractScoringSection("SCRIPT REWRITE —", "VERDICT RATIONALE —");
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
    extractScoringSection("PRE-OUTPUT MANDATORY CHECK", "Return ONLY JSON"),
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

export function errorDetail(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
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

export function countFilledBlockers(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const findings = (raw as { topFindings?: unknown }).topFindings;
  if (!Array.isArray(findings)) return 0;
  return findings.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const title = (item as { title?: unknown }).title;
    return typeof title === "string" && title.trim().length > 0;
  }).length;
}

export function countFilledActions(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const actions = (raw as { priorityActions?: unknown }).priorityActions;
  if (!Array.isArray(actions)) return 0;
  return actions.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const action = (item as { action?: unknown }).action;
    return typeof action === "string" && action.trim().length > 0;
  }).length;
}

/**
 * Old single Job 4 used max 3 actions / max 3 findings, except GOOD AD
 * PROTECTION (scroll+watch ≥ 80) which caps at 2 and allows an empty list.
 * Round-4 split insights dropped to 2 actions / 1 blocker on ads that the
 * old call filled to 3 / 2 — those are the defaults when scores are unknown
 * or the ad is not in the 80+ band.
 */
export function insightsCountExpectations(scores?: {
  scrollStopScore?: number;
  watchThroughScore?: number;
}): { minActions: number; minBlockers: number } {
  const scroll = scores?.scrollStopScore;
  const watch = scores?.watchThroughScore;
  if (
    typeof scroll === "number" &&
    typeof watch === "number" &&
    scroll + watch >= INSIGHTS_STRONG_AD_SCORE_SUM
  ) {
    return { minActions: 0, minBlockers: 0 };
  }
  return { minActions: INSIGHTS_MIN_ACTIONS, minBlockers: INSIGHTS_MIN_BLOCKERS };
}

export function evaluateInsightsOutput(
  raw: unknown,
  scores?: { scrollStopScore?: number; watchThroughScore?: number }
): InsightsValidation {
  const { minActions, minBlockers } = insightsCountExpectations(scores);
  const reasons: string[] = [];
  const actionCount = countFilledActions(raw);
  const blockerCount = countFilledBlockers(raw);

  if (actionCount < minActions) {
    reasons.push(`priorityActions ${actionCount} < ${minActions}`);
  }
  if (blockerCount < minBlockers) {
    reasons.push(`topFindings ${blockerCount} < ${minBlockers}`);
  }

  return { ok: reasons.length === 0, reasons, actionCount, blockerCount, minActions, minBlockers };
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

export function evaluateHookAngleOutput(raw: unknown): CreativeValidation {
  const reasons: string[] = [];
  const hookCount = countFilledHooks(raw);
  const angleCount = countFilledAngles(raw);

  if (hookCount < CREATIVE_MIN_HOOKS) {
    reasons.push(`hookVariants ${hookCount} < ${CREATIVE_MIN_HOOKS}`);
  }
  if (angleCount < CREATIVE_MIN_ANGLES) {
    reasons.push(`angleRecommendations ${angleCount} < ${CREATIVE_MIN_ANGLES}`);
  }

  return { ok: reasons.length === 0, reasons, hookCount, angleCount };
}

export function evaluateScriptIcpOutput(raw: unknown): CreativeValidation {
  const reasons: string[] = [];
  const script =
    raw && typeof raw === "object"
      ? (raw as { scriptRewrite?: unknown }).scriptRewrite
      : undefined;
  if (typeof script !== "string" || !script.trim()) {
    reasons.push("scriptRewrite missing");
  } else if (!isValidScriptRewrite(script) || looksLikeGraderAnalysis(script)) {
    reasons.push("scriptRewrite is analysis/truncated, not a spoken script");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    hookCount: 0,
    angleCount: 0,
  };
}

export function evaluateCreativeOutput(raw: unknown): CreativeValidation {
  const hooks = evaluateHookAngleOutput(raw);
  const script = evaluateScriptIcpOutput(raw);
  return {
    ok: hooks.ok && script.ok,
    reasons: [...hooks.reasons, ...script.reasons],
    hookCount: hooks.hookCount,
    angleCount: hooks.angleCount,
  };
}

export function logScoringFallback(analysisId: string, detail: string): void {
  console.warn(`[worker] scoring fallback: ${detail} ${analysisId}`);
}

/**
 * One attempt, then exactly one retry on throw or failed validation.
 * Logs the error / validation reason so silent 70s deaths are visible.
 */
export async function retryOnce<T>(
  analysisId: string,
  label: string,
  run: () => Promise<T>,
  validate: (value: T) => { ok: boolean; reasons: string[] },
  options?: { keepLastOnInvalid?: boolean }
): Promise<T> {
  const attempt = async (): Promise<
    | { ok: true; value: T }
    | { ok: false; why: string; error?: unknown; value?: T }
  > => {
    try {
      const value = await run();
      const check = validate(value);
      if (check.ok) return { ok: true, value };
      return {
        ok: false,
        why: check.reasons.join("; ") || "validation failed",
        value,
      };
    } catch (error) {
      return { ok: false, why: `threw: ${errorDetail(error)}`, error };
    }
  };

  const first = await attempt();
  if (first.ok) return first.value;

  console.warn(
    `[worker] scoring.${label} failed, retrying once: ${first.why} ${analysisId}`
  );

  const second = await attempt();
  if (second.ok) return second.value;

  logScoringFallback(analysisId, `${label} failed after retry (${second.why})`);
  if (options?.keepLastOnInvalid) {
    const kept = second.value ?? first.value;
    if (kept !== undefined) return kept;
  }
  if (second.error !== undefined) {
    throw second.error instanceof Error
      ? second.error
      : new Error(`${label} failed after retry: ${second.why}`);
  }
  throw new Error(`${label} output invalid after retry: ${second.why}`);
}

function fieldsPrompt(instructions: string, keys: readonly string[]): string {
  return [
    instructions,
    "",
    "Return ONLY JSON with exactly these keys from the original schema (omit every other key — do not emit scores, findings, or landing-page fields unless they are listed):",
    originalSchemaSubset(keys),
  ].join("\n");
}

function sharedScoringPrefix(input: ScoringParallelInput): string {
  return input.cachedContext
    ? `${input.cachedContext}\n\n${input.prompt}`
    : input.prompt;
}

async function scoringSubcall(
  stage: string,
  analysisId: string,
  input: ScoringParallelInput,
  keys: readonly string[],
  instructions: string,
  maxTokens: number,
  timeoutMs: number,
  usageSink?: (usage: ClaudeUsageTotals) => void
): Promise<unknown> {
  return logWorkerStage(stage, analysisId, () =>
    callClaudeJSON<unknown>({
      system: SCORING_SYSTEM,
      // Shared evidence + Job 4 prompt is identical across the 4 splits —
      // cache that prefix so only the field-subset suffix is uncached.
      cachedContext: sharedScoringPrefix(input),
      prompt: fieldsPrompt(instructions, keys),
      maxTokens,
      temperature: 0.2,
      model: CLAUDE_MODEL,
      grading: true,
      timeoutMs,
      retry: false,
      usageLabel: stage,
      usageSink,
    })
  );
}

async function scoringInsightsCall(
  analysisId: string,
  input: ScoringParallelInput,
  usageSink?: (usage: ClaudeUsageTotals) => void
): Promise<unknown> {
  return retryOnce(
    analysisId,
    "insights",
    () =>
      scoringSubcall(
        "scoring.insights",
        analysisId,
        input,
        SCORING_INSIGHT_KEYS,
        originalInsightsFieldInstructions(),
        INSIGHTS_MAX_TOKENS,
        INSIGHTS_TIMEOUT_MS,
        usageSink
      ),
    evaluateInsightsOutput,
    { keepLastOnInvalid: true }
  );
}

async function scoringHookAngleCall(
  analysisId: string,
  input: ScoringParallelInput,
  usageSink?: (usage: ClaudeUsageTotals) => void
): Promise<unknown> {
  return retryOnce(
    analysisId,
    "hooks",
    () =>
      scoringSubcall(
        "scoring.hooks",
        analysisId,
        input,
        SCORING_HOOK_ANGLE_KEYS,
        originalHookAngleInstructions(),
        HOOK_ANGLE_MAX_TOKENS,
        HOOK_ANGLE_TIMEOUT_MS,
        usageSink
      ),
    evaluateHookAngleOutput
  );
}

async function scoringScriptIcpCall(
  analysisId: string,
  input: ScoringParallelInput,
  usageSink?: (usage: ClaudeUsageTotals) => void
): Promise<unknown> {
  return retryOnce(
    analysisId,
    "script",
    () =>
      scoringSubcall(
        "scoring.script",
        analysisId,
        input,
        SCORING_SCRIPT_ICP_KEYS,
        originalScriptIcpInstructions(),
        SCRIPT_ICP_MAX_TOKENS,
        SCRIPT_ICP_TIMEOUT_MS,
        usageSink
      ),
    evaluateScriptIcpOutput
  );
}

/**
 * Launch the four Job 4 sub-calls in parallel. Grades are required (same
 * failure mode as the previous single call). Insights / hooks / script may
 * fail independently; validateScoringRaw synthesizes those fields from
 * evaluator transcripts — any such fallback is logged with the error.
 */
export function logScoringUsageComparison(
  analysisId: string,
  split: ClaudeUsageTotals
): void {
  const splitIn = totalInputTokens(split);
  // Old Job 4: one 8192-cap call over the same system + evidence prefix.
  // Shared prefix ≈ cache write (or uncached in on a miss). Unique suffixes
  // are extra vs that single call. Output of the 4 splits ≈ the old blob.
  const oldEstIn = Math.max(split.cacheCreationTokens, split.inputTokens);
  console.log(
    `${formatClaudeUsage(`scoring.split ${analysisId}`, split)} | vs-old-job4-est calls=1 in≈${oldEstIn} out≈${split.outputTokens} (8192 cap) cache=${split.cacheReadTokens > 0 ? "hit" : "miss"}`
  );
  if (split.cacheReadTokens === 0 && split.calls > 1) {
    console.warn(
      `[worker] scoring cache miss on shared prefix — 4 splits paid full input (${splitIn} totalIn) vs old single Job 4 (~${oldEstIn}) ${analysisId}`
    );
  }
}

export async function runParallelScoringCalls(
  input: ScoringParallelInput
): Promise<Record<string, unknown>> {
  const analysisId = input.analysisId ?? "scoring";
  const t0 = Date.now();
  const usage = emptyClaudeUsage();
  const usageSink = (part: ClaudeUsageTotals) => {
    const next = addClaudeUsage(usage, part);
    usage.inputTokens = next.inputTokens;
    usage.outputTokens = next.outputTokens;
    usage.cacheCreationTokens = next.cacheCreationTokens;
    usage.cacheReadTokens = next.cacheReadTokens;
    usage.calls = next.calls;
  };

  const settled = await Promise.allSettled([
    scoringSubcall(
      "scoring.grades",
      analysisId,
      input,
      SCORING_GRADE_KEYS,
      originalGradesFieldInstructions(),
      GRADES_MAX_TOKENS,
      GRADES_TIMEOUT_MS,
      usageSink
    ),
    scoringInsightsCall(analysisId, input, usageSink),
    scoringHookAngleCall(analysisId, input, usageSink),
    scoringScriptIcpCall(analysisId, input, usageSink),
  ]);

  const { succeeded, firstError } = collectSuccessfulResults(settled);
  const grades = settled[0];
  const insights = settled[1];
  const hooks = settled[2];
  const script = settled[3];

  console.log(
    `[worker] scoring.parallel ${Date.now() - t0}ms used=${succeeded.length}/4 grades=${grades.status} insights=${insights.status} hooks=${hooks.status} script=${script.status} ${analysisId}`
  );
  logScoringUsageComparison(analysisId, usage);

  if (grades.status === "rejected") {
    throw grades.reason instanceof Error
      ? grades.reason
      : firstError instanceof Error
        ? firstError
        : new Error("Scoring grades call failed.");
  }

  if (insights.status === "rejected") {
    logScoringFallback(
      analysisId,
      `insights call failed — ${errorDetail(insights.reason)}`
    );
  }
  if (hooks.status === "rejected") {
    logScoringFallback(
      analysisId,
      `hooks/angles call failed — ${errorDetail(hooks.reason)}`
    );
  }
  if (script.status === "rejected") {
    logScoringFallback(
      analysisId,
      `script/icp call failed — ${errorDetail(script.reason)}`
    );
  }

  return mergeScoringPartials([
    pickDefinedKeys(grades.value, SCORING_GRADE_KEYS),
    insights.status === "fulfilled"
      ? pickDefinedKeys(insights.value, SCORING_INSIGHT_KEYS)
      : {},
    hooks.status === "fulfilled"
      ? pickDefinedKeys(hooks.value, SCORING_HOOK_ANGLE_KEYS)
      : {},
    script.status === "fulfilled"
      ? pickDefinedKeys(script.value, SCORING_SCRIPT_ICP_KEYS)
      : {},
  ]);
}
