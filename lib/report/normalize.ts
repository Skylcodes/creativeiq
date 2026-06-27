import type { AnalysisReport } from "@/lib/types/report";
import { hydrateFunnelReportFields } from "@/lib/report/enrich-report";
import { resolveScriptRewrite } from "@/lib/report/script-rewrite";

const EMPTY_REPORT: AnalysisReport = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  overallFunnelScore: 0,
  creativeStrengthScore: 0,
  conversionScore: { total: 0, categories: [] },
  headline: "",
  angleTags: [],
  agentFindings: [],
  angleRecommendations: [],
  topBlockers: [],
  hookVariants: [],
  scriptRewrite: "",
  priorityActions: [],
  flags: {
    landingPagePartial: false,
    landingPageFailed: false,
    creativeKind: "script",
    notes: [],
  },
  rawAgents: {},
};

export function normalizeReport(
  report: AnalysisReport | null | undefined
): AnalysisReport {
  if (!report) return EMPTY_REPORT;

  const hydrated = hydrateFunnelReportFields(
    {
      agentFindings: report.agentFindings ?? [],
      priorityActions: report.priorityActions ?? [],
      topBlockers: report.topBlockers ?? [],
      conversionScore: report.conversionScore ?? { total: 0, categories: [] },
      angleRecommendations: report.angleRecommendations ?? [],
    },
    {
      skeptical_buyer: report.rawAgents?.skeptical_buyer,
      direct_response: report.rawAgents?.direct_response,
      verdict: report.rawAgents?.verdict,
    }
  );

  return {
    ...EMPTY_REPORT,
    ...report,
    creativeScoreBreakdown:
      report.creativeScoreBreakdown ??
      (report.creativeStrengthScore != null
        ? {
            strategicScore: report.creativeStrengthScore,
            retentionScore: report.creativeStrengthScore,
          }
        : undefined),
    conversionScore: {
      total: report.conversionScore?.total ?? 0,
      categories: report.conversionScore?.categories ?? [],
    },
    angleTags: report.angleTags ?? [],
    agentFindings: hydrated.agentFindings,
    angleRecommendations: report.angleRecommendations ?? [],
    topBlockers: report.topBlockers ?? [],
    hookVariants: report.hookVariants ?? [],
    scriptRewrite:
      resolveScriptRewrite({
        synthesis: report.scriptRewrite || hydrated.scriptRewriteFallback,
        drCritic: report.rawAgents?.direct_response ?? "",
        hookVariants: report.hookVariants ?? [],
      }) ||
      hydrated.scriptRewriteFallback ||
      report.scriptRewrite ||
      "",
    priorityActions: hydrated.priorityActions,
    flags: {
      ...EMPTY_REPORT.flags,
      ...report.flags,
      notes: report.flags?.notes ?? [],
    },
    rawAgents: {
      ...(report.rawAgents ?? {}),
      verdict:
        report.rawAgents?.verdict?.trim() ||
        hydrated.verdictFallback ||
        "",
    },
  };
}

export type BuyerPersona = {
  id: string;
  title: string;
  likelihood: "High" | "Medium" | "Low";
  summary: string;
  narrative: string;
};

export function buildBuyerPersonas(report: AnalysisReport): BuyerPersona[] {
  // Use the AI-generated ICP simulation when available (new analyses).
  if (report.icpSimulation?.personas?.length) {
    return report.icpSimulation.personas.map((p) => ({
      id: p.id,
      title: p.title,
      likelihood: p.likelihood,
      summary: p.summary,
      narrative: p.narrative,
    }));
  }

  // Fallback for legacy reports that predate the ICP simulation call.
  const skeptical = report.rawAgents?.skeptical_buyer ?? "";
  const competitor = report.rawAgents?.competing_brand ?? "";
  const skepticalFinding = report.agentFindings.find(
    (a) => a.agentId === "skeptical_buyer"
  );

  const conversionTotal = report.conversionScore?.total ?? 0;
  const creativeScore = report.creativeStrengthScore ?? 0;

  return [
    {
      id: "highly_aware",
      title: "Highly Aware Buyer",
      likelihood: conversionTotal >= 75 ? "High" : conversionTotal >= 55 ? "Medium" : "Low",
      summary:
        creativeScore >= 70
          ? "Already knows the category — evaluates your offer against alternatives quickly."
          : "Knows what they want but your creative doesn't differentiate fast enough.",
      narrative:
        competitor ||
        skepticalFinding?.summary ||
        "This buyer has seen offers like yours before. They scan for proof, price justification, and a reason to switch now.",
    },
    {
      id: "problem_aware",
      title: "Problem Aware Buyer",
      likelihood: conversionTotal >= 65 ? "Medium" : "Low",
      summary:
        report.headline ||
        "Feels the pain but needs the mechanism and outcome spelled out clearly.",
      narrative:
        report.agentFindings.find((a) => a.agentId === "direct_response")
          ?.summary ||
        skeptical.slice(0, 600) ||
        "They recognize the problem but hesitate on whether your solution is the right fit for their situation.",
    },
    {
      id: "skeptical_cold",
      title: "Skeptical / Cold Buyer",
      likelihood: creativeScore >= 60 ? "Medium" : "Low",
      summary:
        skepticalFinding?.summary ||
        "Default scroll-past behavior unless the hook earns another second.",
      narrative:
        skeptical ||
        "This buyer is busy, skeptical, and allergic to hype. They need a specific reason to stop scrolling and a risk-free path to try.",
    },
  ];
}
