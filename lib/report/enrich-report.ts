import type {
  AgentFinding,
  AngleRecommendation,
  ConversionCategory,
  ConversionScore,
  PriorityAction,
  ConversionBlocker,
} from "@/lib/types/report";
import { extractScriptRewriteFromAgent } from "@/lib/report/script-rewrite";

const AGENT_META: Record<string, { agentName: string }> = {
  skeptical_buyer: { agentName: "The Skeptical Buyer" },
  direct_response: { agentName: "The Direct Response Critic" },
};

type RawAgents = {
  skeptical_buyer?: string;
  direct_response?: string;
  verdict?: string;
};

type HydratableFields = {
  agentFindings: AgentFinding[];
  priorityActions: PriorityAction[];
  topBlockers: ConversionBlocker[];
  conversionScore: ConversionScore;
  angleRecommendations: AngleRecommendation[];
};

/** First displayable summary from an agent transcript. */
export function extractAgentSummary(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  const labeled = text.match(
    /(?:creative verdict|auction verdict|one-line creative verdict|the auction verdict)[:\s—-]+([\s\S]+?)(?:\n\n|\n(?=[A-Z#])|$)/i
  );
  if (labeled?.[1]?.trim()) {
    return collapseWhitespace(labeled[1]).slice(0, 320);
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 30 && !/^#{1,3}\s/.test(p) && !/^REWRITE:/i.test(p));

  if (paragraphs[0]) {
    return collapseWhitespace(paragraphs[0]).slice(0, 320);
  }

  return collapseWhitespace(text).slice(0, 320);
}

/** Pull bullet-like findings from free-form agent output. */
export function extractKeyFindings(raw: string, max = 5): string[] {
  const text = raw.trim();
  if (!text) return [];

  const findings: string[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const bullet = trimmed.match(/^[-•*]\s+(.+)/) ?? trimmed.match(/^\d+[.)]\s+(.+)/);
    if (bullet?.[1] && bullet[1].length > 20) {
      findings.push(collapseWhitespace(bullet[1]));
    }
  }

  if (findings.length >= 3) {
    return dedupeStrings(findings).slice(0, max);
  }

  const strategicBlocks = [
    ...text.matchAll(
      /(?:Current Problem|Strategic Fix|Expected Impact|3-SECOND HOOK|MESSAGE-TO-MARKET)[:\s—-]+([\s\S]+?)(?:\n\n|\n(?=[A-Z])|$)/gi
    ),
  ];
  for (const match of strategicBlocks) {
    const sentence = collapseWhitespace(match[1] ?? "");
    if (sentence.length > 25) findings.push(sentence);
  }

  if (findings.length >= 2) {
    return dedupeStrings(findings).slice(0, max);
  }

  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && /["'""]/.test(s));

  return dedupeStrings(sentences).slice(0, max);
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function severityToImpact(
  severity: ConversionBlocker["severity"]
): PriorityAction["impact"] {
  if (severity === "critical") return "high";
  if (severity === "high") return "high";
  return "medium";
}

function blockerToAction(blocker: ConversionBlocker): PriorityAction {
  const fix =
    blocker.strategicFix?.trim() ||
    blocker.detail?.trim() ||
    blocker.title?.trim() ||
    "Address this conversion blocker";

  return {
    action: imperativeFromFix(fix),
    impact: severityToImpact(blocker.severity),
    effort: "medium",
    currentProblem: blocker.currentProblem ?? blocker.detail,
    whyItMatters: blocker.whyItMatters,
    strategicFix: blocker.strategicFix ?? fix,
    expectedImpact: blocker.expectedImpact,
  };
}

function categoryToAction(cat: ConversionCategory): PriorityAction | null {
  const improvement = cat.improvement?.trim();
  if (!improvement || improvement.length < 15) return null;

  const pct = cat.maxScore ? cat.score / cat.maxScore : 0;
  if (pct >= 0.75) return null;

  return {
    action: imperativeFromFix(improvement),
    impact: pct < 0.5 ? "high" : "medium",
    effort: "medium",
    currentProblem: cat.verdict?.trim(),
    whyItMatters: `Landing page ${cat.label.toLowerCase()} is underperforming (${cat.score}/${cat.maxScore}).`,
    strategicFix: improvement,
    expectedImpact: "Improves post-click conversion for traffic this ad sends.",
  };
}

function imperativeFromFix(fix: string): string {
  const trimmed = fix.trim();
  if (!trimmed) return "Fix this issue";
  const withoutPeriod = trimmed.replace(/\.$/, "");
  if (/^(add|change|replace|rewrite|cut|move|test|remove|fix|update|show|open with)\b/i.test(withoutPeriod)) {
    return withoutPeriod.charAt(0).toUpperCase() + withoutPeriod.slice(1);
  }
  return withoutPeriod.charAt(0).toUpperCase() + withoutPeriod.slice(1);
}

function hydrateAgentFindings(
  findings: AgentFinding[],
  rawAgents: RawAgents
): AgentFinding[] {
  const byId = new Map(findings.map((f) => [f.agentId, f]));
  const result: AgentFinding[] = [];

  for (const agentId of ["skeptical_buyer", "direct_response"] as const) {
    const raw = rawAgents[agentId]?.trim() ?? "";
    const existing = byId.get(agentId);
    const meta = AGENT_META[agentId];

    const summary =
      existing?.summary?.trim() ||
      (raw ? extractAgentSummary(raw) : "") ||
      "";

    const existingFindings = (existing?.keyFindings ?? []).filter(Boolean);
    const keyFindings =
      existingFindings.length >= 3
        ? existingFindings
        : raw
          ? extractKeyFindings(raw)
          : existingFindings;

    if (!summary && keyFindings.length === 0) continue;

    result.push({
      agentId,
      agentName: existing?.agentName ?? meta.agentName,
      summary,
      keyFindings: keyFindings.length > 0 ? keyFindings : [summary].filter(Boolean),
    });
  }

  return result;
}

function hydratePriorityActions(
  actions: PriorityAction[],
  topBlockers: ConversionBlocker[],
  categories: ConversionCategory[]
): PriorityAction[] {
  const result: PriorityAction[] = actions
    .filter((a) => a.action?.trim())
    .map((a) => ({
      ...a,
      action: a.action.trim(),
      currentProblem: a.currentProblem ?? a.strategicFix,
      strategicFix: a.strategicFix ?? a.action,
    }));

  const seen = new Set(result.map((a) => a.action.toLowerCase().slice(0, 60)));

  for (const blocker of topBlockers) {
    if (result.length >= 8) break;
    const action = blockerToAction(blocker);
    const key = action.action.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }

  const sortedCategories = [...categories].sort(
    (a, b) => (a.score / (a.maxScore || 1)) - (b.score / (b.maxScore || 1))
  );

  for (const cat of sortedCategories) {
    if (result.length >= 8) break;
    const action = categoryToAction(cat);
    if (!action) continue;
    const key = action.action.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }

  return result.slice(0, 8);
}

export type HydratedFunnelFields = HydratableFields & {
  scriptRewriteFallback: string;
  verdictFallback: string;
};

/**
 * Backfills agent summaries, priority actions, and related fields from raw
 * agent transcripts when the synthesis JSON is thin or incomplete.
 */
export function hydrateFunnelReportFields(
  fields: HydratableFields,
  rawAgents: RawAgents
): HydratedFunnelFields {
  const agentFindings = hydrateAgentFindings(fields.agentFindings, rawAgents);

  const priorityActions = hydratePriorityActions(
    fields.priorityActions,
    fields.topBlockers,
    fields.conversionScore.categories ?? []
  );

  const scriptRewriteFallback = rawAgents.direct_response
    ? extractScriptRewriteFromAgent(rawAgents.direct_response)
    : "";

  const verdictFallback =
    rawAgents.verdict?.trim() ||
    (fields.angleRecommendations[0]
      ? `Launch first: ${fields.angleRecommendations[0].angle}. ${fields.angleRecommendations[0].rationale ?? ""}`.trim()
      : "");

  return {
    ...fields,
    agentFindings,
    priorityActions,
    scriptRewriteFallback,
    verdictFallback,
  };
}
