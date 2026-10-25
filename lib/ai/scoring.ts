import "server-only";

import { callClaudeJSON, CLAUDE_MODEL } from "@/lib/ai/client";
import { SCORING_SYSTEM } from "@/lib/ai/pipeline-prompts";
import { mapGeminiToRetention } from "@/lib/ai/retention-map";
import type { VideoDefect } from "@/lib/ai/video-analysis-types";
import {
  LANDING_PAGE_CATEGORY_DEFS,
  type ScoringRaw,
  type ScoringResult,
} from "@/lib/ai/pipeline-types";
import {
  extractAgentSummary,
  extractKeyFindings,
} from "@/lib/report/enrich-report";
import {
  extractScriptRewriteFromAgent,
  sanitizeScriptRewrite,
  spokenScriptBody,
} from "@/lib/report/script-rewrite";
import type {
  AgentFinding,
  ConversionCategory,
  ConversionCategoryKey,
  Verdict,
  VerdictLabel,
} from "@/lib/types/report";

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// ---------------------------------------------------------------------------
// Deterministic composites — never delegate arithmetic to the model.
// ---------------------------------------------------------------------------

export function computeCreativeStrengthScore(
  scrollStopScore: number,
  watchThroughScore: number
): number {
  return clamp(clamp(scrollStopScore, 0, 50) + clamp(watchThroughScore, 0, 50), 0, 100);
}

export function computeLandingPageTotal(categories: ConversionCategory[]): number {
  const total = categories.reduce(
    (sum, c) => sum + clamp(c.score ?? 0, 0, c.maxScore ?? 0),
    0
  );
  return clamp(total, 0, 100);
}

/** Overall Funnel Score = (Creative Strength × 0.55) + (Landing Page × 0.45). */
export function computeOverallFunnelScore(
  creativeStrengthScore: number,
  landingPageTotal: number,
  retentionScore?: number
): number {
  const blended = creativeStrengthScore * 0.55 + landingPageTotal * 0.45;
  // A strong landing page cannot rescue an ad nobody watches: the page only
  // converts traffic the creative actually delivers. When the creative or its
  // retention is weak, the overall is capped just above the weaker of the two.
  const creativeGate = Math.min(
    creativeStrengthScore,
    retentionScore ?? creativeStrengthScore
  );
  const capped = creativeGate < 70 ? Math.min(blended, creativeGate + 8) : blended;
  return clamp(capped, 0, 100);
}

export { mapGeminiToRetention } from "@/lib/ai/retention-map";

export function computeVerdict(overallFunnelScore: number, rationale: string): Verdict {
  const label: VerdictLabel =
    overallFunnelScore >= 85
      ? "LAUNCH"
      : overallFunnelScore >= 70
        ? "LAUNCH_WITH_FIXES"
        : overallFunnelScore >= 55
          ? "TEST_SMALL"
          : "REWORK";

  const words = rationale.trim().split(/\s+/).filter(Boolean);
  const trimmedRationale =
    words.length > 25 ? `${words.slice(0, 25).join(" ")}…` : rationale.trim();

  return { label, rationale: trimmedRationale };
}

export const VERDICT_LABEL_TEXT: Record<VerdictLabel, string> = {
  LAUNCH: "LAUNCH",
  LAUNCH_WITH_FIXES: "LAUNCH WITH FIXES",
  TEST_SMALL: "TEST SMALL",
  REWORK: "REWORK",
};

/** Gemini / visual-analysis signals used to calibrate inflated model scores (video only). */
export type VisualRetentionSignals = {
  coldScrollStopScore?: number;
  watchThroughScore?: number;
  dropOffMoments?: string[];
  defects?: VideoDefect[];
  visualAnalysisMode?: "gemini_vertex" | "timeline_sampling" | "thumbnail_fallback";
};

function geminiHalfScaleCap(geminiRaw: number): number {
  return clamp(Math.round(geminiRaw * 5), 0, 50);
}

function shouldCapToVisualEvidence(
  modelScore: number,
  visualCap: number,
  geminiRaw: number
): boolean {
  if (geminiRaw <= 7) return modelScore > visualCap;
  // Strong Gemini (8+) — only pull down when model is far above visual evidence.
  return modelScore > visualCap + 8;
}

/**
 * Only raise toward Gemini evidence when BOTH watch signals are clearly strong (8+).
 * Raising at 7 was letting mediocre Gemini grades (common for boring ads) pull
 * scores up; the frame-sampling fallback accidentally scored bad ads better
 * because it applied hard caps instead.
 */
function shouldRaiseToVisualEvidence(
  modelScore: number,
  visualFloor: number,
  coldN: number,
  watchN: number
): boolean {
  if (coldN < 8 || watchN < 8) return false;
  return modelScore < visualFloor - 10;
}

/**
 * Calibrates scroll-stop, watch-through, and retention using Job 1 visual evidence.
 * Caps inflated model scores toward weak Gemini signals AND raises under-scored
 * model outputs toward clearly strong (7-10/10) Gemini signals — evidence must be
 * able to move the score in either direction, or good creative can never be
 * recognized as good. When Gemini is unavailable (frame sampling only), applies
 * conservative ceilings so bad ads cannot score higher than good ads simply
 * because full-video analysis failed.
 */
export function calibrateScoresFromVisualEvidence(
  scores: {
    scrollStopScore: number;
    watchThroughScore: number;
    retentionScore: number;
  },
  signals?: VisualRetentionSignals
): {
  scrollStopScore: number;
  watchThroughScore: number;
  retentionScore: number;
} {
  let { scrollStopScore, watchThroughScore, retentionScore } = scores;

  const cold = signals?.coldScrollStopScore;
  const watch = signals?.watchThroughScore;
  const hasGemini = cold != null || watch != null;
  const weakVisual =
    signals?.visualAnalysisMode === "timeline_sampling" ||
    signals?.visualAnalysisMode === "thumbnail_fallback";

  if (hasGemini) {
    const coldN = clamp(cold ?? 5, 0, 10);
    const dropsForWatch = signals?.dropOffMoments?.filter(Boolean).length ?? 0;
    // Defensive: mirror normalizeAnalysis if raw (un-normalized) signals arrive.
    const watchN = Math.min(clamp(watch ?? 5, 0, 10), dropsForWatch >= 2 ? 6 : 10);
    const scrollCap = geminiHalfScaleCap(coldN);
    const watchCap = geminiHalfScaleCap(watchN);
    let retentionCap = clamp(mapGeminiToRetention(coldN, watchN), 0, 100);

    const dropCount = signals?.dropOffMoments?.filter(Boolean).length ?? 0;
    // Drop-offs are already reflected in Gemini's (normalized) watch score; only
    // apply an extra ceiling when the watcher itself rated watch-through weak,
    // otherwise one set of drop-offs gets penalised twice (e.g. 8/8 → 5/6 → 40).
    if (dropCount >= 2 && watchN <= 4) retentionCap = Math.min(retentionCap, 55);
    if (dropCount >= 3 && watchN <= 4) retentionCap = Math.min(retentionCap, 40);

    if (shouldCapToVisualEvidence(scrollStopScore, scrollCap, coldN)) {
      scrollStopScore = Math.min(scrollStopScore, scrollCap);
    } else if (shouldRaiseToVisualEvidence(scrollStopScore, scrollCap, coldN, watchN)) {
      scrollStopScore = Math.max(scrollStopScore, scrollCap);
    }
    if (shouldCapToVisualEvidence(watchThroughScore, watchCap, watchN)) {
      watchThroughScore = Math.min(watchThroughScore, watchCap);
    } else if (shouldRaiseToVisualEvidence(watchThroughScore, watchCap, coldN, watchN)) {
      watchThroughScore = Math.max(watchThroughScore, watchCap);
    }
    // Retention = watchability on its own terms, taken from the full-video
    // watcher's defect-capped signals. The scoring model's own retention number
    // is ignored here: it was dragging retention down for off-brand / landing-
    // page mismatches, which belong in conversion and the overall score only.
    // Hook gate: viewers who never stop cannot be retained, so a weak opening
    // bounds retention regardless of how watchable the rest is.
    const hookGate = coldN <= 4 ? 50 : coldN === 5 ? 62 : coldN === 6 ? 69 : 100;
    retentionScore = Math.min(retentionCap, hookGate);
  } else if (weakVisual) {
    scrollStopScore = Math.min(scrollStopScore, 30);
    watchThroughScore = Math.min(watchThroughScore, 30);
    retentionScore = Math.min(retentionScore, 50);
  }

  return {
    scrollStopScore: clamp(scrollStopScore, 0, 50),
    watchThroughScore: clamp(watchThroughScore, 0, 50),
    retentionScore: clamp(retentionScore, 0, 100),
  };
}

/** @deprecated Use calibrateScoresFromVisualEvidence — retained for tests. */
export function anchorRetentionScore(
  modelRetention: number,
  signals?: VisualRetentionSignals
): number {
  return calibrateScoresFromVisualEvidence(
    { scrollStopScore: 0, watchThroughScore: 0, retentionScore: modelRetention },
    signals
  ).retentionScore;
}

// ---------------------------------------------------------------------------
// Resilient normalization — models omit fields, nest them, use legacy keys,
// or truncate long JSON. Recover from evidence instead of failing the run.
// ---------------------------------------------------------------------------

export type ValidateScoringFallbacks = {
  viewerRaw?: string;
  performanceExpertRaw?: string;
};

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function firstString(raw: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = optionalString(raw[key]);
    if (value) return value;
  }
  return undefined;
}

function firstNumber(raw: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (value === undefined || value === null) continue;
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

const LP_CATEGORY_KEY_ALIASES: Record<string, ConversionCategoryKey> = {
  hook_strength: "above_fold_clarity",
  lead_magnet_clarity: "offer_clarity",
  brand_memorability: "funnel_continuity",
};

function extractLandingPageArray(raw: Record<string, unknown>): unknown[] {
  if (Array.isArray(raw.landingPageCategories)) return raw.landingPageCategories;
  if (Array.isArray(raw.conversionCategories)) return raw.conversionCategories;
  if (Array.isArray(raw.landing_page_categories)) return raw.landing_page_categories;

  const conversionScore = raw.conversionScore;
  if (conversionScore && typeof conversionScore === "object") {
    const categories = (conversionScore as Record<string, unknown>).categories;
    if (Array.isArray(categories)) return categories;
  }

  return [];
}

function defaultCategoryScore(_maxScore: number): number {
  // Missing categories must not inflate totals — truncated JSON was scoring bad ads too high.
  return 0;
}

export function normalizeLandingPageCategories(raw: unknown): ConversionCategory[] {
  const entries = Array.isArray(raw) ? raw : [];
  const byKey = new Map<string, Record<string, unknown>>();

  for (const item of entries) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const rawKey = String(entry.key ?? entry.category ?? entry.id ?? "");
    const key = LP_CATEGORY_KEY_ALIASES[rawKey] ?? rawKey;
    if (key) byKey.set(key, entry);
  }

  return LANDING_PAGE_CATEGORY_DEFS.map((def) => {
    const entry = byKey.get(def.key);
    const scoreRaw = entry?.score ?? entry?.value;
    const scoreNum = Number(scoreRaw);
    const score = Number.isFinite(scoreNum)
      ? clamp(scoreNum, 0, def.maxScore)
      : defaultCategoryScore(def.maxScore);

    return {
      key: def.key,
      label: def.label,
      maxScore: def.maxScore,
      score,
      verdict:
        entry && typeof entry.verdict === "string"
          ? entry.verdict.trim()
          : entry
            ? "Partially evaluated from available synthesis output."
            : "Category not returned by synthesis — scored as 0 until evidence is present.",
      improvement:
        entry && typeof entry.improvement === "string" ? entry.improvement.trim() : "",
    };
  });
}

export function resolveScrollStopScore(raw: Record<string, unknown>): number {
  const direct = firstNumber(raw, [
    "scrollStopScore",
    "scroll_stop_score",
    "scrollStop",
  ]);
  if (direct !== undefined) return clamp(direct, 0, 50);

  const strategic = firstNumber(raw, ["strategicScore", "strategic_score"]);
  if (strategic !== undefined) return clamp(strategic * 0.5, 0, 50);

  const creativeStrength = firstNumber(raw, [
    "creativeStrengthScore",
    "creative_strength_score",
  ]);
  if (creativeStrength !== undefined) return clamp(creativeStrength * 0.25, 0, 50);

  const retention = firstNumber(raw, ["retentionScore", "retention_score"]);
  if (retention !== undefined) return clamp(retention * 0.4, 0, 50);

  return 0;
}

export function resolveWatchThroughScore(raw: Record<string, unknown>): number {
  const direct = firstNumber(raw, [
    "watchThroughScore",
    "watch_through_score",
    "watchThrough",
  ]);
  if (direct !== undefined) return clamp(direct, 0, 50);

  const strategic = firstNumber(raw, ["strategicScore", "strategic_score"]);
  if (strategic !== undefined) return clamp(strategic * 0.5, 0, 50);

  const creativeStrength = firstNumber(raw, [
    "creativeStrengthScore",
    "creative_strength_score",
  ]);
  if (creativeStrength !== undefined) return clamp(creativeStrength * 0.25, 0, 50);

  const scrollStop = firstNumber(raw, ["scrollStopScore", "scroll_stop_score"]);
  if (scrollStop !== undefined) return clamp(scrollStop, 0, 50);

  const retention = firstNumber(raw, ["retentionScore", "retention_score"]);
  if (retention !== undefined) return clamp(retention * 0.4, 0, 50);

  return 0;
}

export function resolveRetentionScore(
  raw: Record<string, unknown>,
  scrollStopScore: number,
  watchThroughScore: number
): number {
  const direct = firstNumber(raw, ["retentionScore", "retention_score"]);
  if (direct !== undefined) return clamp(direct, 0, 100);

  return clamp((scrollStopScore + watchThroughScore) * 1.0, 0, 100);
}

export function resolveHeadline(
  raw: Record<string, unknown>,
  fallbacks?: ValidateScoringFallbacks
): string {
  const direct = firstString(raw, [
    "headline",
    "executiveSummary",
    "executive_summary",
    "summary",
  ]);
  if (direct) return direct;

  const rationale = resolveVerdictRationale(raw, "");
  if (rationale && rationale !== "Score reflects observable creative and landing-page evidence.") {
    return rationale;
  }

  const performanceSummary = fallbacks?.performanceExpertRaw
    ? extractAgentSummary(fallbacks.performanceExpertRaw)
    : "";
  if (performanceSummary) return performanceSummary;

  const viewerSummary = fallbacks?.viewerRaw
    ? extractAgentSummary(fallbacks.viewerRaw)
    : "";
  if (viewerSummary) return viewerSummary;

  return "Analysis reflects observable creative and landing-page evidence.";
}

/**
 * Models sometimes omit `verdictRationale`, nest it under `verdict.rationale`,
 * or truncate it when the JSON response runs long — derive from other fields
 * rather than failing the entire analysis.
 */
export function resolveVerdictRationale(
  raw: Record<string, unknown>,
  headline: string
): string {
  const direct = firstString(raw, [
    "verdictRationale",
    "verdict_rationale",
    "verdictSummary",
    "verdict_summary",
  ]);
  if (direct) return direct;

  const verdict = raw.verdict;
  if (verdict && typeof verdict === "object" && verdict !== null) {
    const nested = optionalString((verdict as Record<string, unknown>).rationale);
    if (nested) return nested;
  }

  if (headline.trim()) return headline.trim();

  const topFindings = Array.isArray(raw.topFindings) ? raw.topFindings : [];
  for (const item of topFindings) {
    if (item && typeof item === "object") {
      const detail = optionalString((item as Record<string, unknown>).detail);
      if (detail) return detail;
      const title = optionalString((item as Record<string, unknown>).title);
      if (title) return title;
    }
  }

  const agentFindings = Array.isArray(raw.agentFindings) ? raw.agentFindings : [];
  for (const agentId of ["direct_response", "skeptical_buyer"]) {
    const finding = agentFindings.find(
      (f) =>
        f &&
        typeof f === "object" &&
        (f as Record<string, unknown>).agentId === agentId
    ) as Record<string, unknown> | undefined;
    const summary = finding ? optionalString(finding.summary) : undefined;
    if (summary) return summary;
  }

  return "Score reflects observable creative and landing-page evidence.";
}

function scriptWordCount(text: string): number {
  return spokenScriptBody(text).split(/\s+/).filter(Boolean).length;
}

function buildMinimalScriptRewrite(seed: string): string {
  const base =
    seed.trim() ||
    "Open on the exact problem this product solves, show the product handling it within the first few seconds, explain why it matters for this audience, and close with one specific next step.";
  const padding =
    " Keep the pacing tight. Cut any line that does not earn the next second of attention. Name the outcome early, prove it visually, and land the offer without jargon.";
  const body = `${base}${padding}`.trim();
  return `${body}\n\nProduction note: UGC talking head, natural light, direct to camera. Opening frame: creator delivers the hook line in the first two seconds.`;
}

export function resolveScriptRewrite(
  raw: Record<string, unknown>,
  fallbacks?: ValidateScoringFallbacks
): string {
  const candidates: string[] = [];

  for (const key of [
    "scriptRewrite",
    "script_rewrite",
    "rewrittenScript",
    "rewritten_script",
    "script",
  ]) {
    const value = optionalString(raw[key]);
    if (value) candidates.push(value);
  }

  if (fallbacks?.performanceExpertRaw) {
    const extracted = extractScriptRewriteFromAgent(fallbacks.performanceExpertRaw);
    if (extracted) candidates.push(extracted);
  }

  const hookVariants = Array.isArray(raw.hookVariants) ? raw.hookVariants : [];
  for (const variant of hookVariants) {
    if (variant && typeof variant === "object") {
      const hook = optionalString((variant as Record<string, unknown>).hook);
      if (hook) candidates.push(hook);
    }
  }

  const priorityActions = Array.isArray(raw.priorityActions) ? raw.priorityActions : [];
  for (const action of priorityActions) {
    if (action && typeof action === "object") {
      const fix = optionalString((action as Record<string, unknown>).strategicFix);
      if (fix) candidates.push(fix);
    }
  }

  for (const candidate of candidates) {
    const sanitized = sanitizeScriptRewrite(candidate);
    if (sanitized && scriptWordCount(sanitized) >= 50) {
      return sanitized.includes("Production note:")
        ? sanitized
        : `${sanitized}\n\nProduction note: UGC talking head, natural light, direct to camera. Opening frame: creator delivers the hook in the first two seconds.`;
    }
  }

  const headline = resolveHeadline(raw, fallbacks);
  return buildMinimalScriptRewrite(headline);
}

function padKeyFindings(findings: string[], summary: string, min = 3): string[] {
  const out = [...findings.filter(Boolean)];
  if (summary && out.length === 0) out.push(summary);
  while (out.length < min) {
    out.push(summary || "See full agent transcript for additional detail.");
    if (out.length >= min) break;
    out.push("Evaluation grounded in the uploaded creative and landing page.");
  }
  return out.slice(0, Math.max(min, out.length)).slice(0, 5);
}

function synthesizeAgentFinding(
  agentId: string,
  agentName: string,
  transcript: string
): AgentFinding {
  const summary = extractAgentSummary(transcript) || "See full transcript below.";
  const keyFindings = padKeyFindings(extractKeyFindings(transcript, 5), summary);
  return { agentId, agentName, summary, keyFindings };
}

export function normalizeAgentFindings(
  raw: Record<string, unknown>,
  fallbacks?: ValidateScoringFallbacks
): AgentFinding[] {
  const incoming = Array.isArray(raw.agentFindings) ? raw.agentFindings : [];
  const byId = new Map<string, AgentFinding>();

  for (const item of incoming) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const agentId = String(entry.agentId ?? entry.id ?? "");
    if (!agentId) continue;

    const normalizedId =
      agentId === "real_viewer"
        ? "skeptical_buyer"
        : agentId === "performance_expert"
          ? "direct_response"
          : agentId;

    const summary =
      optionalString(entry.summary) ??
      (normalizedId === "skeptical_buyer" && fallbacks?.viewerRaw
        ? extractAgentSummary(fallbacks.viewerRaw)
        : normalizedId === "direct_response" && fallbacks?.performanceExpertRaw
          ? extractAgentSummary(fallbacks.performanceExpertRaw)
          : "See full transcript below.");

    const rawFindings = Array.isArray(entry.keyFindings)
      ? (entry.keyFindings as unknown[])
          .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
      : [];

    const keyFindings =
      rawFindings.length >= 2
        ? rawFindings
        : padKeyFindings(
            rawFindings,
            normalizedId === "skeptical_buyer" && fallbacks?.viewerRaw
              ? extractKeyFindings(fallbacks.viewerRaw, 5).join(" ")
              : normalizedId === "direct_response" && fallbacks?.performanceExpertRaw
                ? extractKeyFindings(fallbacks.performanceExpertRaw, 5).join(" ")
                : summary
          );

    byId.set(normalizedId, {
      agentId: normalizedId,
      agentName:
        optionalString(entry.agentName) ??
        (normalizedId === "skeptical_buyer"
          ? "The Real Viewer"
          : "The Performance Expert"),
      summary,
      keyFindings,
    });
  }

  if (!byId.has("skeptical_buyer") && fallbacks?.viewerRaw) {
    byId.set(
      "skeptical_buyer",
      synthesizeAgentFinding(
        "skeptical_buyer",
        "The Real Viewer",
        fallbacks.viewerRaw
      )
    );
  }

  if (!byId.has("direct_response") && fallbacks?.performanceExpertRaw) {
    byId.set(
      "direct_response",
      synthesizeAgentFinding(
        "direct_response",
        "The Performance Expert",
        fallbacks.performanceExpertRaw
      )
    );
  }

  if (!byId.has("skeptical_buyer")) {
    byId.set("skeptical_buyer", {
      agentId: "skeptical_buyer",
      agentName: "The Real Viewer",
      summary: "Viewer evaluation unavailable — see raw transcript if present.",
      keyFindings: padKeyFindings([], "Viewer evaluation unavailable."),
    });
  }

  if (!byId.has("direct_response")) {
    byId.set("direct_response", {
      agentId: "direct_response",
      agentName: "The Performance Expert",
      summary: "Performance evaluation unavailable — see raw transcript if present.",
      keyFindings: padKeyFindings([], "Performance evaluation unavailable."),
    });
  }

  return ["skeptical_buyer", "direct_response"]
    .map((id) => byId.get(id))
    .filter((f): f is AgentFinding => Boolean(f));
}

export function validateScoringRaw(
  raw: unknown,
  fallbacks?: ValidateScoringFallbacks
): ScoringRaw {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Scoring synthesis did not return a JSON object.");
  }
  const r = raw as Record<string, unknown>;

  const scrollStopScore = resolveScrollStopScore(r);
  const watchThroughScore = resolveWatchThroughScore(r);
  const retentionScore = resolveRetentionScore(r, scrollStopScore, watchThroughScore);
  const headline = resolveHeadline(r, fallbacks);
  const verdictRationale = resolveVerdictRationale(r, headline);
  const scriptRewrite = resolveScriptRewrite(r, fallbacks);
  const landingPageCategories = normalizeLandingPageCategories(
    extractLandingPageArray(r)
  );
  const agentFindings = normalizeAgentFindings(r, fallbacks);

  return {
    scrollStopScore,
    scrollStopEvidence:
      firstString(r, ["scrollStopEvidence", "scroll_stop_evidence"]) ?? undefined,
    watchThroughScore,
    watchThroughEvidence:
      firstString(r, ["watchThroughEvidence", "watch_through_evidence"]) ?? undefined,
    retentionScore,
    retentionRationale:
      firstString(r, ["retentionRationale", "retention_rationale"]) ?? undefined,
    landingPageCategories,
    headline,
    angleTags: Array.isArray(r.angleTags) ? (r.angleTags as ScoringRaw["angleTags"]) : [],
    agentFindings,
    topFindings: Array.isArray(r.topFindings)
      ? (r.topFindings as ScoringRaw["topFindings"]).slice(0, 3)
      : [],
    priorityActions: Array.isArray(r.priorityActions)
      ? (r.priorityActions as ScoringRaw["priorityActions"]).slice(0, 3)
      : [],
    angleRecommendations: Array.isArray(r.angleRecommendations)
      ? (r.angleRecommendations as ScoringRaw["angleRecommendations"])
      : [],
    hookVariants: Array.isArray(r.hookVariants)
      ? (r.hookVariants as ScoringRaw["hookVariants"])
      : [],
    scriptRewrite,
    icpSimulation:
      r.icpSimulation &&
      typeof r.icpSimulation === "object" &&
      Array.isArray((r.icpSimulation as { personas?: unknown }).personas)
        ? (r.icpSimulation as ScoringRaw["icpSimulation"])
        : undefined,
    competitiveInsights: Array.isArray(r.competitiveInsights)
      ? (r.competitiveInsights as string[]).filter((s) => typeof s === "string")
      : undefined,
    verdictRationale,
  };
}

export type ScoringSynthesisInput = {
  cachedContext: string;
  prompt: string;
  fallbacks?: ValidateScoringFallbacks;
  /** When present (video creatives), caps inflated retentionScore using Job 1 Gemini signals. */
  visualRetentionSignals?: VisualRetentionSignals;
  analysisId?: string;
};

/** Internal prompt/pipeline jargon that must never reach user-facing report text. */
const INTERNAL_JARGON_PATTERN =
  /\b(scoring contract|retention scoring contract|internal retention guidance|contract|maps? to|mapped target|centers? (?:near|at|on)|calibrat\w*|rubric|fitted(?: v3)? model|v3|pred2s|est2s|gemini|visual intelligence|cold\s*=|watch\s*=|retentionScore|coldScrollStop\w*|watchThrough\w*|scrollStopScore|strategicScore|creativeStrengthScore|\d+\s*\/\s*10\b)/i;

/**
 * Removes sentences that leak internal scoring mechanics (prompt contracts,
 * signal numbers, field names) from user-facing text. Returns "" if nothing
 * clean remains.
 */
export function stripInternalJargon(text: string | undefined): string {
  const t = text?.trim() ?? "";
  if (!t) return "";
  const sentences = t.split(/(?<=[.!?])\s+/);
  return sentences
    .map((s) => s.trim())
    .filter((s) => s && !INTERNAL_JARGON_PATTERN.test(s))
    .join(" ")
    .trim();
}

export function alignRetentionRationale(
  rationale: string | undefined,
  appliedScore: number
): string {
  const score = Math.round(clamp(appliedScore, 0, 100));
  const clean = stripInternalJargon(rationale)
    // Drop any other score-looking number so text can never contradict the stored score.
    .replace(/\b(?:retention(?: score)?(?: of| is|:)?\s*)~?\d{1,3}(?:\s*\/\s*100)?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[\s—–:,.-]+/, "")
    .replace(/^./, (c) => c.toUpperCase());
  const lead = `Retention: ${score}/100.`;
  return clean ? `${lead} ${clean}` : lead;
}

const SEVERITY_ORDER = { critical: 3, major: 2, minor: 1 } as const;

/** Defects that are about brand/landing-page fit, not watchability — excluded from retention. */
const OFF_TOPIC_DEFECT = /\b(brand|landing page|landing-page|mismatch|off[- ]brand|wrong product|funnel|page)\b/i;

/** Positive "viewers stay" phrasing that must not appear next to a weak retention score. */
const POSITIVE_HOLD =
  /\b(hold(s)? (well|attention|viewers)|will stay|keep(s)? (most )?(viewers )?watching|most (viewers|people) (stay|will|keep|watch)|highly likely|strong(ly)? (hold|retention)|earn(s)? (genuine )?watch time|lands cleanly)\b/i;

const LEAD_BY_DEFECT: Record<string, [string, string]> = {
  hook: ["Most viewers scroll past in the first two seconds.", "The opening loses a lot of viewers in the first two seconds."],
  comprehension: ["Most viewers leave because it isn't clear what is being sold or why.", "Many viewers drop because the message takes too long to land."],
  reading_burden: ["Most viewers leave once the ad asks them to stop and read.", "Many viewers drop when the ad turns into reading."],
  pacing: ["Most viewers drift away during the slow stretches.", "Many viewers drift during the slower stretches."],
  length: ["Most viewers leave long before the payoff — the ad runs far longer than its content.", "Many viewers drop before the payoff because it runs long."],
  watchability: ["Most viewers won't sit through it — it is hard to watch.", "Many viewers drop because it is hard to follow."],
  payoff: ["Most viewers leave without a payoff that matches the hook.", "Many viewers drop because the payoff doesn't match the hook."],
};

/**
 * Band opener that agrees with what follows: led by the worst watchability
 * defect when there is one, otherwise a neutral band statement.
 */
export function retentionBandLead(score: number, topDefect?: VideoDefect): string {
  if (score >= 85) return "Most viewers who see this will stop and watch it through.";
  if (score >= 75) {
    return topDefect && topDefect.severity !== "minor"
      ? "A solid share of viewers will stop and stay, but some drop at the point below."
      : "A solid share of viewers will stop and stay; a smaller portion drop before the payoff.";
  }
  const pair = topDefect ? LEAD_BY_DEFECT[topDefect.type] : undefined;
  if (score >= 60) return pair?.[1] ?? "Many viewers will scroll past or drop before the payoff.";
  return pair?.[0] ?? "Most viewers will leave before the payoff.";
}

function defectSentence(d: VideoDefect): string {
  const evidence = stripInternalJargon(d.evidence).replace(/[.\s]+$/, "");
  const ts = d.timestamp?.trim() ? ` (${d.timestamp.trim()})` : "";
  return evidence ? `${evidence.charAt(0).toUpperCase()}${evidence.slice(1)}${ts}.` : "";
}

/**
 * User-facing retention write-up built FROM the final score and the watcher's
 * ranked defects: leads with band-appropriate tone, then the main drop reasons
 * worst-first, then only model sentences whose tone agrees with the score.
 */
export function composeRetentionRationale(
  score: number,
  defects: VideoDefect[] | undefined,
  modelText: string | undefined
): string {
  const s = Math.round(clamp(score, 0, 100));
  const ranked = (defects ?? [])
    .filter((d) => d?.evidence && !OFF_TOPIC_DEFECT.test(d.evidence))
    .sort((a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0));
  const shown = s >= 85 ? ranked.filter((d) => d.severity !== "minor") : ranked;
  const reasons = shown.slice(0, 3).map(defectSentence).filter(Boolean);

  const modelClean = alignRetentionRationale(modelText, s).replace(/^Retention: \d+\/100\.\s*/, "");
  const modelSentences = modelClean
    .split(/(?<=[.!?])\s+/)
    .filter((x) => x.trim())
    .filter((x) => !OFF_TOPIC_DEFECT.test(x))
    .filter((x) => s >= 75 || !POSITIVE_HOLD.test(x));

  const parts = [`Retention: ${s}/100. ${retentionBandLead(s, shown[0])}`];
  if (reasons.length) {
    parts.push(`${s >= 75 ? "Where viewers drop" : "Main reasons viewers drop"}: ${reasons.join(" ")}`);
  }
  const extra = modelSentences.slice(0, reasons.length ? 2 : 3).join(" ");
  if (extra) parts.push(extra);
  return parts.join(" ").replace(/\s{2,}/g, " ").trim();
}

export function needsCompetitiveInsightsRetry(insights?: string[]): boolean {
  return !insights?.some((s) => typeof s === "string" && s.trim().length > 0);
}

export const FALLBACK_COMPETITIVE_INSIGHT =
  "Market intelligence was unavailable; no competitive claims invented.";

export function applyCompetitiveInsightsRetry(
  current: string[] | undefined,
  retry: string[] | undefined
): string[] {
  const unique = [...(current ?? []), ...(retry ?? [])]
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim())
    .filter((s, i, arr) => arr.indexOf(s) === i);
  return unique.length ? unique : [FALLBACK_COMPETITIVE_INSIGHT];
}

export function formatWorkerGeminiLog(
  analysisId: string,
  signals: { coldScrollStopScore?: number; watchThroughScore?: number }
): string {
  return `[worker] gemini ${analysisId} cold=${signals.coldScrollStopScore ?? "n/a"} watch=${signals.watchThroughScore ?? "n/a"}`;
}

export function formatWorkerRetentionLog(
  analysisId: string,
  oldScore: number,
  applied: number
): string {
  return `[worker] retention ${analysisId} old=${oldScore} new=${applied} applied=${applied}`;
}

/**
 * JOB 4 — single scoring/synthesis call. Produces every numeric grading
 * output from the evidence gathered in Jobs 1-3. Composites (creative
 * strength, landing page total, overall funnel score, verdict) are always
 * computed deterministically here in application code, never by the model.
 */
export async function runScoringSynthesis(
  input: ScoringSynthesisInput
): Promise<ScoringResult> {
  const raw = await callClaudeJSON<unknown>({
    system: SCORING_SYSTEM,
    cachedContext: input.cachedContext,
    prompt: input.prompt,
    maxTokens: 6144,
    temperature: 0.2,
    model: CLAUDE_MODEL,
    grading: true,
  });

  const validated = validateScoringRaw(raw, input.fallbacks);

  let competitiveInsights = validated.competitiveInsights;
  if (needsCompetitiveInsightsRetry(competitiveInsights)) {
    try {
      const retry = await callClaudeJSON<{ competitiveInsights?: unknown }>({
        system:
          "Return ONLY JSON. competitiveInsights must be 2-4 short market-grounded notes. If market intelligence is missing, return one note saying so. Never return an empty array.",
        cachedContext: input.cachedContext,
        prompt: `${input.prompt}\n\nYour previous JSON omitted or emptied competitiveInsights. Return ONLY {"competitiveInsights":[...]} now.`,
        maxTokens: 800,
        temperature: 0.2,
        model: CLAUDE_MODEL,
        grading: true,
      });
      competitiveInsights = applyCompetitiveInsightsRetry(
        competitiveInsights,
        Array.isArray(retry.competitiveInsights)
          ? retry.competitiveInsights.filter((s): s is string => typeof s === "string")
          : undefined
      );
    } catch {
      competitiveInsights = applyCompetitiveInsightsRetry(competitiveInsights, undefined);
    }
  } else {
    competitiveInsights = applyCompetitiveInsightsRetry(competitiveInsights, undefined);
  }

  const calibrated = calibrateScoresFromVisualEvidence(
    {
      scrollStopScore: validated.scrollStopScore,
      watchThroughScore: validated.watchThroughScore,
      retentionScore: validated.retentionScore,
    },
    input.visualRetentionSignals
  );

  console.log(
    formatWorkerRetentionLog(
      input.analysisId ?? "unknown",
      validated.retentionScore,
      calibrated.retentionScore
    )
  );

  const creativeStrengthScore = computeCreativeStrengthScore(
    calibrated.scrollStopScore,
    calibrated.watchThroughScore
  );
  const landingPageTotal = computeLandingPageTotal(validated.landingPageCategories);
  const overallFunnelScore = computeOverallFunnelScore(
    creativeStrengthScore,
    landingPageTotal,
    input.visualRetentionSignals ? calibrated.retentionScore : undefined
  );
  const verdict = computeVerdict(overallFunnelScore, validated.verdictRationale);

  return {
    ...validated,
    competitiveInsights,
    scrollStopScore: calibrated.scrollStopScore,
    watchThroughScore: calibrated.watchThroughScore,
    retentionScore: calibrated.retentionScore,
    retentionRationale: composeRetentionRationale(
      calibrated.retentionScore,
      input.visualRetentionSignals?.defects,
      validated.retentionRationale
    ),
    creativeStrengthScore,
    landingPageTotal,
    overallFunnelScore,
    verdict,
  };
}
