import "server-only";

import { callClaudeJSON, CLAUDE_MODEL } from "@/lib/ai/client";
import { SCORING_SYSTEM } from "@/lib/ai/pipeline-prompts";
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
  landingPageTotal: number
): number {
  return clamp(creativeStrengthScore * 0.55 + landingPageTotal * 0.45, 0, 100);
}

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
  // Clear weakness on the 0-10 Gemini scale — always trust the cap when model exceeds it.
  if (geminiRaw <= 4) return modelScore > visualCap;
  // Average-or-better Gemini — only pull down when model is far above visual evidence.
  return modelScore > visualCap + 12;
}

/**
 * Calibrates scroll-stop, watch-through, and retention using Job 1 visual evidence.
 * Caps inflated model scores; never raises them. When Gemini is unavailable (frame
 * sampling only), applies conservative ceilings so bad ads cannot score higher
 * than good ads simply because full-video analysis failed.
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
    const watchN = clamp(watch ?? 5, 0, 10);
    const scrollCap = geminiHalfScaleCap(coldN);
    const watchCap = geminiHalfScaleCap(watchN);
    let retentionCap = clamp(Math.round(coldN * 4 + watchN * 6), 0, 100);

    const dropCount = signals?.dropOffMoments?.filter(Boolean).length ?? 0;
    if (dropCount >= 2) retentionCap = Math.min(retentionCap, 55);
    if (dropCount >= 3) retentionCap = Math.min(retentionCap, 40);

    if (shouldCapToVisualEvidence(scrollStopScore, scrollCap, coldN)) {
      scrollStopScore = Math.min(scrollStopScore, scrollCap);
    }
    if (shouldCapToVisualEvidence(watchThroughScore, watchCap, watchN)) {
      watchThroughScore = Math.min(watchThroughScore, watchCap);
    }
    if (
      retentionScore > retentionCap + 8 ||
      (coldN <= 4 && retentionScore > retentionCap) ||
      (watchN <= 4 && retentionScore > retentionCap)
    ) {
      retentionScore = Math.min(retentionScore, retentionCap);
    }
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
};

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
    maxTokens: 8192,
    temperature: 0.2,
    model: CLAUDE_MODEL,
    grading: true,
  });

  const validated = validateScoringRaw(raw, input.fallbacks);

  const calibrated = calibrateScoresFromVisualEvidence(
    {
      scrollStopScore: validated.scrollStopScore,
      watchThroughScore: validated.watchThroughScore,
      retentionScore: validated.retentionScore,
    },
    input.visualRetentionSignals
  );

  const creativeStrengthScore = computeCreativeStrengthScore(
    calibrated.scrollStopScore,
    calibrated.watchThroughScore
  );
  const landingPageTotal = computeLandingPageTotal(validated.landingPageCategories);
  const overallFunnelScore = computeOverallFunnelScore(creativeStrengthScore, landingPageTotal);
  const verdict = computeVerdict(overallFunnelScore, validated.verdictRationale);

  return {
    ...validated,
    scrollStopScore: calibrated.scrollStopScore,
    watchThroughScore: calibrated.watchThroughScore,
    retentionScore: calibrated.retentionScore,
    creativeStrengthScore,
    landingPageTotal,
    overallFunnelScore,
    verdict,
  };
}
