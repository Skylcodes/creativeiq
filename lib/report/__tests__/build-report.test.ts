import { describe, expect, it } from "vitest";
import { buildAnalysisReport } from "@/lib/report/build-report";
import type {
  MarketIntelligenceResult,
  PerformanceEvaluation,
  ScoringResult,
  ViewerEvaluation,
  VisualIntelligence,
} from "@/lib/ai/pipeline-types";

function baseScoring(overrides: Partial<ScoringResult> = {}): ScoringResult {
  return {
    scrollStopScore: 45,
    watchThroughScore: 44,
    retentionScore: 88,
    landingPageCategories: [],
    headline: "Strong ad, ready to launch with real budget.",
    angleTags: [],
    agentFindings: [
      {
        agentId: "skeptical_buyer",
        agentName: "The Real Viewer",
        summary: "Would click.",
        keyFindings: ["Clear hook", "Believable claim"],
      },
      {
        agentId: "direct_response",
        agentName: "The Performance Expert",
        summary: "Would fund.",
        keyFindings: ["Strong hook", "Clear offer"],
      },
    ],
    topFindings: [],
    priorityActions: [],
    angleRecommendations: [],
    hookVariants: [],
    scriptRewrite: `${"A".repeat(100)}\n\nProduction note: talking head, natural light.`,
    verdictRationale: "Strong hook and clear offer with no material weaknesses.",
    creativeStrengthScore: 89,
    landingPageTotal: 92,
    overallFunnelScore: 90,
    verdict: { label: "LAUNCH", rationale: "Strong hook and clear offer." },
    ...overrides,
  };
}

const visualIntelligence: VisualIntelligence = {
  kind: "video",
  briefText: "AD CREATIVE — VIDEO\n\n...",
  sourceNotes: [],
};

const viewer: ViewerEvaluation = { raw: "I would click because the hook is specific." };
const performanceExpert: PerformanceEvaluation = {
  raw: "Would I put real budget behind this? Yes — the hook and offer are clear.",
};

const cleanMarketIntelligence: MarketIntelligenceResult = { brief: null, degraded: false };

describe("buildAnalysisReport (Job 5 — deterministic formatting)", () => {
  it("maps a clean scoring result into the existing AnalysisReport schema", () => {
    const report = buildAnalysisReport({
      scoring: baseScoring(),
      visualIntelligence,
      marketIntelligence: cleanMarketIntelligence,
      viewer,
      performanceExpert,
      landingPageStatus: "ok",
    });

    expect(report.overallFunnelScore).toBe(90);
    expect(report.creativeStrengthScore).toBe(89);
    expect(report.verdict?.label).toBe("LAUNCH");
    expect(report.headline.startsWith("LAUNCH —")).toBe(true);
    expect(report.topBlockers).toEqual([]);
    expect(report.flags.landingPagePartial).toBe(false);
    expect(report.flags.landingPageFailed).toBe(false);
    expect(report.flags.notes).toEqual([]);
    expect(report.rawAgents.skeptical_buyer).toBe(viewer.raw);
    expect(report.rawAgents.direct_response).toBe(performanceExpert.raw);
  });

  it("allows zero findings as a valid, complete result", () => {
    const report = buildAnalysisReport({
      scoring: baseScoring({ topFindings: [], priorityActions: [] }),
      visualIntelligence,
      marketIntelligence: cleanMarketIntelligence,
      viewer,
      performanceExpert,
      landingPageStatus: "ok",
    });

    expect(report.topBlockers).toEqual([]);
    expect(report.priorityActions).toEqual([]);
  });

  it("surfaces a landing-page failure flag without fabricating content", () => {
    const report = buildAnalysisReport({
      scoring: baseScoring(),
      visualIntelligence,
      marketIntelligence: cleanMarketIntelligence,
      viewer,
      performanceExpert,
      landingPageStatus: "failed",
      lpError: "timed out",
    });

    expect(report.flags.landingPageFailed).toBe(true);
    expect(report.flags.notes.some((n) => n.includes("timed out"))).toBe(true);
  });

  it("surfaces a market-intelligence degradation note instead of fabricating competitive claims", () => {
    const report = buildAnalysisReport({
      scoring: baseScoring(),
      visualIntelligence,
      marketIntelligence: { brief: null, degraded: true },
      viewer,
      performanceExpert,
      landingPageStatus: "ok",
    });

    expect(report.flags.notes.some((n) => /market intelligence/i.test(n))).toBe(true);
    expect(report.intelligenceBrief).toBeUndefined();
    expect(report.competitiveInsights).toBeUndefined();
  });

  it("surfaces visual-intelligence degradation notes from Job 1 timeouts/failures", () => {
    const report = buildAnalysisReport({
      scoring: baseScoring(),
      visualIntelligence: {
        ...visualIntelligence,
        sourceNotes: ["Visual intelligence degraded: timed out"],
      },
      marketIntelligence: cleanMarketIntelligence,
      viewer,
      performanceExpert,
      landingPageStatus: "ok",
    });

    expect(report.flags.notes).toContain("Visual intelligence degraded: timed out");
  });

  it("computes a lower verdict band consistently through the headline/verdict text", () => {
    const report = buildAnalysisReport({
      scoring: baseScoring({
        overallFunnelScore: 40,
        verdict: { label: "REWORK", rationale: "Fundamental problems exist." },
      }),
      visualIntelligence,
      marketIntelligence: cleanMarketIntelligence,
      viewer,
      performanceExpert,
      landingPageStatus: "ok",
    });

    expect(report.verdict?.label).toBe("REWORK");
    expect(report.headline.startsWith("REWORK —")).toBe(true);
    expect(report.rawAgents.verdict).toContain("REWORK");
  });
});
