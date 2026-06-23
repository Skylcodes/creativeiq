import "server-only";

import { ensureScriptRewrite } from "@/lib/ai/script-rewrite-fallback";
import type { FunnelReportRaw } from "@/lib/ai/funnel-grading";
import type { RawCriteria } from "@/lib/ai/criteria";
import { hydrateFunnelReportFields } from "@/lib/report/enrich-report";
import type {
  AnalysisReport,
  ConversionCategory,
  ConversionScore,
  CriteriaChecklistItem,
  IcpSimulation,
  IntelligenceBrief,
} from "@/lib/types/report";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function normalizeConversion(categories: ConversionCategory[]): ConversionScore {
  const normalized = categories.map((c) => ({
    ...c,
    score: clamp(c.score ?? 0, 0, c.maxScore ?? 0),
  }));
  const total = clamp(
    normalized.reduce((sum, c) => sum + c.score, 0),
    0,
    100
  );
  return { total, categories: normalized };
}

export type BuildFunnelAnalysisReportInput = {
  reportRaw: FunnelReportRaw;
  buyer: string;
  drCritic: string;
  drRewriteSeed: string;
  brandProfileText: string;
  creativeText: string;
  platformText: string;
  landingPageStatus: "ok" | "partial" | "failed";
  lpError?: string;
  creativeKind: AnalysisReport["flags"]["creativeKind"];
  criteriaList?: RawCriteria[];
  intelligenceBrief?: IntelligenceBrief | null;
  brandProfilePartial?: boolean;
  videoContext?: AnalysisReport["videoContext"];
  extraFlagNotes?: string[];
};

/**
 * Builds the same AnalysisReport object standalone analysis persists —
 * shared by funnel pipeline and comparison variant grading.
 */
export async function buildFunnelAnalysisReport(
  input: BuildFunnelAnalysisReportInput
): Promise<AnalysisReport> {
  const hydrated = hydrateFunnelReportFields(
    {
      agentFindings: input.reportRaw.agentFindings ?? [],
      priorityActions: input.reportRaw.priorityActions ?? [],
      topBlockers: input.reportRaw.topBlockers ?? [],
      conversionScore: {
        total: 0,
        categories: input.reportRaw.conversionCategories ?? [],
      },
      angleRecommendations: input.reportRaw.angleRecommendations ?? [],
    },
    {
      skeptical_buyer: input.buyer,
      direct_response: input.drCritic,
      verdict: input.reportRaw.verdictSummary ?? "",
    }
  );

  const conversionScore = normalizeConversion(
    input.reportRaw.conversionCategories ?? []
  );
  const creativeStrengthScore = clamp(
    input.reportRaw.creativeStrengthScore ?? 0,
    0,
    100
  );
  const overallFunnelScore = clamp(
    (conversionScore.total + creativeStrengthScore) / 2,
    0,
    100
  );

  const flagsNotes: string[] = [...(input.extraFlagNotes ?? [])];
  if (input.landingPageStatus !== "ok") {
    flagsNotes.push(
      input.landingPageStatus === "failed"
        ? `Landing page could not be fully analyzed${input.lpError ? ` (${input.lpError})` : ""}.`
        : "Landing page returned limited content; some scoring is conservative."
    );
  }
  if (input.creativeKind === "video-placeholder") {
    flagsNotes.push("Video was not transcribed; creative judged from context only.");
  }
  if (input.brandProfilePartial) {
    flagsNotes.push("Brand profile was derived from limited data.");
  }

  const icpSimulation: IcpSimulation | undefined =
    Array.isArray(input.reportRaw.icpSimulation?.personas) &&
    input.reportRaw.icpSimulation.personas.length > 0
      ? { personas: input.reportRaw.icpSimulation.personas }
      : undefined;

  const criteriaList = input.criteriaList ?? [];
  const criteriaChecklist: CriteriaChecklistItem[] | undefined =
    criteriaList.length > 0 && Array.isArray(input.reportRaw.criteriaChecklist)
      ? criteriaList.map((raw) => {
          const aiResult = input.reportRaw.criteriaChecklist!.find(
            (r) => r.id === raw.id
          );
          return {
            id: raw.id,
            category: raw.category,
            label: raw.label,
            pass: aiResult?.pass ?? null,
            note:
              aiResult?.pass === null
                ? aiResult.note || "Not applicable to this ad's goal."
                : aiResult?.note,
          };
        })
      : undefined;

  const scriptRewrite = await ensureScriptRewrite({
    synthesis: input.reportRaw.scriptRewrite,
    drCritic: input.drCritic,
    drRewriteSeed: input.drRewriteSeed,
    hookVariants: input.reportRaw.hookVariants ?? [],
    creativeContext: input.creativeText,
    platformText: input.platformText,
    brandProfileText: input.brandProfileText,
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    overallFunnelScore,
    creativeStrengthScore,
    conversionScore,
    headline: input.reportRaw.headline ?? "",
    angleTags: input.reportRaw.angleTags ?? [],
    agentFindings: hydrated.agentFindings,
    angleRecommendations: input.reportRaw.angleRecommendations ?? [],
    topBlockers: (input.reportRaw.topBlockers ?? []).slice(0, 5),
    hookVariants: input.reportRaw.hookVariants ?? [],
    scriptRewrite,
    priorityActions: hydrated.priorityActions,
    ...(icpSimulation ? { icpSimulation } : {}),
    ...(input.intelligenceBrief ? { intelligenceBrief: input.intelligenceBrief } : {}),
    ...(criteriaChecklist ? { criteriaChecklist } : {}),
    flags: {
      landingPagePartial: input.landingPageStatus === "partial",
      landingPageFailed: input.landingPageStatus === "failed",
      creativeKind: input.creativeKind,
      notes: flagsNotes,
    },
    ...(input.videoContext ? { videoContext: input.videoContext } : {}),
    rawAgents: {
      skeptical_buyer: input.buyer,
      direct_response: input.drCritic,
      verdict:
        input.reportRaw.verdictSummary?.trim() ||
        hydrated.verdictFallback ||
        "",
    },
  };
}

/** Derive comparison synthesis bullets from a full analysis report. */
export function deriveComparisonFeedbackFromReport(report: AnalysisReport): {
  strengths: string[];
  weaknesses: string[];
  improvements: string | null;
  productionNote: string | null;
  summary: string;
} {
  const strengths = report.agentFindings
    .flatMap((finding) => finding.keyFindings ?? [])
    .filter(Boolean)
    .slice(0, 3);

  const weaknesses = (report.topBlockers ?? [])
    .slice(0, 3)
    .map((blocker) =>
      blocker.title
        ? `${blocker.title}: ${blocker.detail}`
        : blocker.detail
    )
    .filter(Boolean);

  const showRewrite = report.creativeStrengthScore < 75;
  const scriptBody = report.scriptRewrite
    .replace(/\n*Production note:[\s\S]*$/i, "")
    .trim();
  const productionMatch = report.scriptRewrite.match(
    /\n*Production note:\s*([\s\S]+)$/i
  );

  return {
    strengths,
    weaknesses,
    improvements:
      showRewrite && scriptBody.length > 20 ? scriptBody : null,
    productionNote:
      showRewrite && productionMatch?.[1]
        ? productionMatch[1].trim()
        : null,
    summary:
      report.headline?.trim() ||
      report.rawAgents?.verdict?.trim().slice(0, 280) ||
      "",
  };
}
