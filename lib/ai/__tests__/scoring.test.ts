import { describe, expect, it } from "vitest";
import {
  anchorRetentionScore,
  calibrateScoresFromVisualEvidence,
  computeCreativeStrengthScore,
  computeLandingPageTotal,
  computeOverallFunnelScore,
  computeVerdict,
  normalizeAgentFindings,
  normalizeLandingPageCategories,
  resolveHeadline,
  resolveScriptRewrite,
  resolveScrollStopScore,
  resolveVerdictRationale,
  resolveWatchThroughScore,
  validateScoringRaw,
} from "@/lib/ai/scoring";
import { LANDING_PAGE_CATEGORY_DEFS } from "@/lib/ai/pipeline-types";
import type { ConversionCategory } from "@/lib/types/report";
import type { AgentFinding } from "@/lib/types/report";

// ---------------------------------------------------------------------------
// Deterministic composites — these must never be delegated to the model.
// ---------------------------------------------------------------------------

describe("calibrateScoresFromVisualEvidence", () => {
  it("caps inflated creative scores when Gemini shows clear weakness", () => {
    const result = calibrateScoresFromVisualEvidence(
      { scrollStopScore: 42, watchThroughScore: 40, retentionScore: 78 },
      { coldScrollStopScore: 3, watchThroughScore: 4 }
    );
    expect(result.scrollStopScore).toBeLessThanOrEqual(15);
    expect(result.watchThroughScore).toBeLessThanOrEqual(20);
    expect(result.retentionScore).toBeLessThanOrEqual(36);
  });

  it("caps inflated model scores when Gemini shows average (6-7) watch signals", () => {
    const result = calibrateScoresFromVisualEvidence(
      { scrollStopScore: 38, watchThroughScore: 36, retentionScore: 72 },
      { coldScrollStopScore: 6, watchThroughScore: 7 }
    );
    expect(result.scrollStopScore).toBe(30);
    expect(result.watchThroughScore).toBe(35);
    expect(result.retentionScore).toBeLessThanOrEqual(66);
  });

  it("does not cap model scores that already align with strong Gemini signals (8+)", () => {
    const result = calibrateScoresFromVisualEvidence(
      { scrollStopScore: 38, watchThroughScore: 36, retentionScore: 72 },
      { coldScrollStopScore: 8, watchThroughScore: 8 }
    );
    expect(result.scrollStopScore).toBe(38);
    expect(result.watchThroughScore).toBe(36);
    expect(result.retentionScore).toBe(72);
  });

  it("applies conservative caps when only frame sampling was available", () => {
    const result = calibrateScoresFromVisualEvidence(
      { scrollStopScore: 45, watchThroughScore: 44, retentionScore: 80 },
      { visualAnalysisMode: "timeline_sampling" }
    );
    expect(result.scrollStopScore).toBe(30);
    expect(result.watchThroughScore).toBe(30);
    expect(result.retentionScore).toBe(50);
  });

  it("raises conservatively low creative scores when Gemini shows clearly strong watch signals", () => {
    // A genuinely excellent video (coldN=9, watchN=9) must not be stuck with an
    // anchored, overly-cautious model score — evidence should pull it back up.
    const result = calibrateScoresFromVisualEvidence(
      { scrollStopScore: 20, watchThroughScore: 18, retentionScore: 40 },
      { coldScrollStopScore: 9, watchThroughScore: 9 }
    );
    expect(result.scrollStopScore).toBe(45);
    expect(result.watchThroughScore).toBe(45);
    expect(result.retentionScore).toBe(90);
  });

  it("caps a bad ad when Gemini reports mediocre watch signals and the model inflates", () => {
    const result = calibrateScoresFromVisualEvidence(
      { scrollStopScore: 42, watchThroughScore: 40, retentionScore: 78 },
      { coldScrollStopScore: 5, watchThroughScore: 5, dropOffMoments: ["~0:08"] }
    );
    expect(result.scrollStopScore).toBe(25);
    expect(result.watchThroughScore).toBe(25);
    expect(result.retentionScore).toBeLessThanOrEqual(50);
  });

  it("never raises retention above the drop-off-adjusted cap even with strong watch signals", () => {
    // Gemini's own schema says 2+ drop-offs implies watchThroughScore should
    // already be <=6, but guard the contradictory case defensively anyway.
    const result = calibrateScoresFromVisualEvidence(
      { scrollStopScore: 10, watchThroughScore: 40, retentionScore: 20 },
      {
        coldScrollStopScore: 9,
        watchThroughScore: 8,
        dropOffMoments: ["~0:04", "~0:12", "~0:20"],
      }
    );
    expect(result.retentionScore).toBeLessThanOrEqual(55);
  });

  it("still discriminates a genuinely bad ad from a genuinely good ad after symmetric calibration", () => {
    const badAd = calibrateScoresFromVisualEvidence(
      { scrollStopScore: 30, watchThroughScore: 28, retentionScore: 55 },
      { coldScrollStopScore: 2, watchThroughScore: 3, dropOffMoments: ["~0:03", "~0:08"] }
    );
    const goodAd = calibrateScoresFromVisualEvidence(
      { scrollStopScore: 25, watchThroughScore: 25, retentionScore: 45 },
      { coldScrollStopScore: 9, watchThroughScore: 8 }
    );
    expect(goodAd.retentionScore).toBeGreaterThan(badAd.retentionScore);
    expect(goodAd.scrollStopScore + goodAd.watchThroughScore).toBeGreaterThan(
      badAd.scrollStopScore + badAd.watchThroughScore
    );
  });
});

describe("anchorRetentionScore", () => {
  it("caps inflated model retention when Gemini watch signals are weak", () => {
    expect(
      anchorRetentionScore(78, { coldScrollStopScore: 3, watchThroughScore: 4 })
    ).toBe(36);
  });

  it("raises a conservatively low model retention score when Gemini shows clearly strong watch signals", () => {
    // coldN=8, watchN=8 → retentionCap = 8*4 + 8*6 = 80. Model's 35 is far below
    // that earned cap, so evidence must be able to raise it — otherwise a
    // genuinely excellent video can never recover from an anchored model score.
    expect(
      anchorRetentionScore(35, { coldScrollStopScore: 8, watchThroughScore: 8 })
    ).toBe(80);
  });

  it("does not raise a model retention score that is only mildly conservative", () => {
    // Gap is within the 12-point tolerance buffer — no forced adjustment.
    expect(
      anchorRetentionScore(72, { coldScrollStopScore: 8, watchThroughScore: 8 })
    ).toBe(72);
  });

  it("does not raise retention when Gemini signals are only average (below 7/10)", () => {
    expect(
      anchorRetentionScore(35, { coldScrollStopScore: 6, watchThroughScore: 6 })
    ).toBe(35);
  });

  it("leaves score unchanged when no visual signals exist", () => {
    expect(anchorRetentionScore(72, undefined)).toBe(72);
  });

  it("applies stricter cap when multiple drop-off moments are listed", () => {
    expect(
      anchorRetentionScore(80, {
        coldScrollStopScore: 5,
        watchThroughScore: 6,
        dropOffMoments: ["~0:04", "~0:12", "~0:20"],
      })
    ).toBeLessThanOrEqual(40);
  });

  it("closes the 7/7 dead zone — pulls a far-too-low model score up toward the contract target", () => {
    // Reproduces a real production bug: Gemini reported cold=7/watch=7 (contract
    // target ~70, per buildRetentionScoringContract's own mapping), the model's
    // rationale text explicitly said "maps to retentionScore ~70", but the model's
    // retentionScore field stored 50 — a dead zone between the ≤6 cap branch and
    // the ≥8/≥8 raise branch let this self-contradiction through uncorrected.
    const result = anchorRetentionScore(50, {
      coldScrollStopScore: 7,
      watchThroughScore: 7,
    });
    // retentionCap = 7*4 + 7*6 = 70; must land within 12 points of it, not sit at 50.
    expect(result).toBeGreaterThanOrEqual(58);
  });

  it("does not touch a 7/8 retention score that is already close to its contract target", () => {
    // retentionCap = 7*4 + 8*6 = 76; model's 76 is already exact — must pass through.
    expect(
      anchorRetentionScore(76, { coldScrollStopScore: 7, watchThroughScore: 8 })
    ).toBe(76);
  });
});

describe("computeCreativeStrengthScore", () => {
  it("sums the two 0-50 components into a 0-100 total", () => {
    expect(computeCreativeStrengthScore(45, 40)).toBe(85);
    expect(computeCreativeStrengthScore(0, 0)).toBe(0);
    expect(computeCreativeStrengthScore(50, 50)).toBe(100);
  });

  it("clamps each component to 0-50 before summing", () => {
    expect(computeCreativeStrengthScore(60, 60)).toBe(100); // both clamped to 50
    expect(computeCreativeStrengthScore(-10, 30)).toBe(30); // clamped to 0
  });

  it("handles non-finite input defensively", () => {
    expect(computeCreativeStrengthScore(Number.NaN, 30)).toBe(30);
  });
});

describe("computeLandingPageTotal", () => {
  function categories(overrides: Partial<Record<string, number>>): ConversionCategory[] {
    return LANDING_PAGE_CATEGORY_DEFS.map((def) => ({
      key: def.key,
      label: def.label,
      maxScore: def.maxScore,
      score: overrides[def.key] ?? def.maxScore,
      verdict: "",
      improvement: "",
    }));
  }

  it("sums all seven categories to the perfect-score total (100)", () => {
    expect(computeLandingPageTotal(categories({}))).toBe(100);
  });

  it("clamps each category score to its own maxScore", () => {
    // message_match maxScore is 20 — an inflated 999 must not blow out the total.
    const cats = categories({ message_match: 999 });
    expect(computeLandingPageTotal(cats)).toBe(100);
  });

  it("reflects partial category scores proportionally", () => {
    const cats = categories({
      message_match: 10, // half of 20
      above_fold_clarity: 0,
      social_proof: 0,
      offer_clarity: 0,
      objection_handling: 0,
      visual_ux: 0,
      funnel_continuity: 0,
    });
    expect(computeLandingPageTotal(cats)).toBe(10);
  });
});

describe("computeOverallFunnelScore", () => {
  it("weights creative strength 55% and landing page 45%", () => {
    expect(computeOverallFunnelScore(100, 100)).toBe(100);
    expect(computeOverallFunnelScore(0, 0)).toBe(0);
    // 80 * 0.55 + 60 * 0.45 = 44 + 27 = 71
    expect(computeOverallFunnelScore(80, 60)).toBe(71);
  });

  it("clamps the result to 0-100", () => {
    expect(computeOverallFunnelScore(200, 200)).toBe(100);
    expect(computeOverallFunnelScore(-50, -50)).toBe(0);
  });
});

describe("computeVerdict", () => {
  it("assigns LAUNCH at and above 85", () => {
    expect(computeVerdict(85, "Strong across the board.").label).toBe("LAUNCH");
    expect(computeVerdict(100, "Strong across the board.").label).toBe("LAUNCH");
  });

  it("assigns LAUNCH_WITH_FIXES between 70 and 84", () => {
    expect(computeVerdict(70, "Solid fundamentals.").label).toBe("LAUNCH_WITH_FIXES");
    expect(computeVerdict(84, "Solid fundamentals.").label).toBe("LAUNCH_WITH_FIXES");
  });

  it("assigns TEST_SMALL between 55 and 69", () => {
    expect(computeVerdict(55, "Functional but flawed.").label).toBe("TEST_SMALL");
    expect(computeVerdict(69, "Functional but flawed.").label).toBe("TEST_SMALL");
  });

  it("assigns REWORK below 55", () => {
    expect(computeVerdict(54, "Fundamental problems exist.").label).toBe("REWORK");
    expect(computeVerdict(0, "Fundamental problems exist.").label).toBe("REWORK");
  });

  it("truncates the rationale to a maximum of 25 words", () => {
    const longRationale = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
    const verdict = computeVerdict(90, longRationale);
    const wordCount = verdict.rationale.replace(/…$/, "").trim().split(/\s+/).length;
    expect(wordCount).toBeLessThanOrEqual(25);
    expect(verdict.rationale.endsWith("…")).toBe(true);
  });

  it("leaves a short rationale untouched", () => {
    const verdict = computeVerdict(90, "Strong hook, clear offer, no material issues.");
    expect(verdict.rationale).toBe("Strong hook, clear offer, no material issues.");
  });
});

// ---------------------------------------------------------------------------
// validateScoringRaw — never trust model JSON blindly.
// ---------------------------------------------------------------------------

function validLandingPageCategories() {
  return LANDING_PAGE_CATEGORY_DEFS.map((def) => ({
    key: def.key,
    score: def.maxScore,
    verdict: "Strong.",
    improvement: "",
  }));
}

function agentFallbacks() {
  return {
    viewerRaw:
      "I stopped scrolling because the opening line was specific. The product made sense quickly. I'd click to see if the offer matches.",
    performanceExpertRaw:
      "Would I put real budget behind this? Yes — the hook is clear and the landing page delivers.\n\nREWRITE: I used to waste money on ads that looked fine but never converted. Then I found this — it fixed the one thing killing my ROAS. Try it before you scale spend again.",
  };
}

function validAgentFindings(): AgentFinding[] {
  return [
    {
      agentId: "skeptical_buyer",
      agentName: "The Real Viewer",
      summary: "Would click.",
      keyFindings: ["Clear hook", "Believable claim", "Obvious next step"],
    },
    {
      agentId: "direct_response",
      agentName: "The Performance Expert",
      summary: "Would fund this.",
      keyFindings: ["Strong hook", "Clear offer", "Matches landing page"],
    },
  ];
}

function baseValidRaw(overrides: Record<string, unknown> = {}) {
  return {
    scrollStopScore: 40,
    watchThroughScore: 38,
    retentionScore: 80,
    landingPageCategories: validLandingPageCategories(),
    headline: "Strong ad, ready to launch.",
    angleTags: [],
    agentFindings: validAgentFindings(),
    topFindings: [],
    priorityActions: [],
    angleRecommendations: [],
    hookVariants: [],
    scriptRewrite: "A".repeat(100) + "\n\nProduction note: talking head, natural light.",
    verdictRationale: "Strong hook and clear offer with no material weaknesses found.",
    ...overrides,
  };
}

describe("validateScoringRaw", () => {
  it("accepts a fully-formed, valid response", () => {
    const result = validateScoringRaw(baseValidRaw());
    expect(result.scrollStopScore).toBe(40);
    expect(result.landingPageCategories).toHaveLength(7);
    expect(result.agentFindings).toHaveLength(2);
  });

  it("throws when the response is not an object", () => {
    expect(() => validateScoringRaw(null)).toThrow();
    expect(() => validateScoringRaw("not json")).toThrow();
  });

  it("infers numeric scores when scrollStopScore is missing", () => {
    const raw = baseValidRaw();
    delete (raw as Record<string, unknown>).scrollStopScore;
    const result = validateScoringRaw({ ...raw, retentionScore: 80 });
    expect(result.scrollStopScore).toBe(32);
  });

  it("derives headline from agent transcripts when missing", () => {
    const raw = baseValidRaw();
    delete (raw as Record<string, unknown>).headline;
    const result = validateScoringRaw(raw, agentFallbacks());
    expect(result.headline.length).toBeGreaterThan(10);
  });

  it("scores missing landing page categories as 0 instead of inflating totals", () => {
    const raw = baseValidRaw({
      landingPageCategories: validLandingPageCategories().slice(0, 3),
    });
    const result = validateScoringRaw(raw);
    expect(result.landingPageCategories).toHaveLength(7);
    const missing = result.landingPageCategories.filter(
      (c) => c.verdict.includes("not returned")
    );
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every((c) => c.score === 0)).toBe(true);
  });

  it("synthesizes agentFindings from transcripts when synthesis returns one", () => {
    const raw = baseValidRaw({ agentFindings: [validAgentFindings()[0]] });
    const result = validateScoringRaw(raw, agentFallbacks());
    expect(result.agentFindings).toHaveLength(2);
    expect(result.agentFindings.some((f) => f.agentId === "direct_response")).toBe(true);
  });

  it("derives scriptRewrite from performance expert transcript when omitted", () => {
    const raw = baseValidRaw();
    delete (raw as Record<string, unknown>).scriptRewrite;
    const result = validateScoringRaw(raw, agentFallbacks());
    expect(result.scriptRewrite.length).toBeGreaterThan(80);
    expect(result.scriptRewrite.toLowerCase()).toContain("production note");
  });

  it("clamps out-of-range scores instead of trusting the model", () => {
    const raw = baseValidRaw({ scrollStopScore: 999, watchThroughScore: -50 });
    const result = validateScoringRaw(raw);
    expect(result.scrollStopScore).toBe(50);
    expect(result.watchThroughScore).toBe(0);
  });

  it("truncates topFindings and priorityActions to a max of 3", () => {
    const raw = baseValidRaw({
      topFindings: [{ title: "a" }, { title: "b" }, { title: "c" }, { title: "d" }],
      priorityActions: [{ action: "a" }, { action: "b" }, { action: "c" }, { action: "d" }],
    });
    const result = validateScoringRaw(raw);
    expect(result.topFindings).toHaveLength(3);
    expect(result.priorityActions).toHaveLength(3);
  });

  it("allows zero findings — an empty array is a valid result", () => {
    const raw = baseValidRaw({ topFindings: [] });
    const result = validateScoringRaw(raw);
    expect(result.topFindings).toEqual([]);
  });

  it("derives verdictRationale from headline when the model omits it", () => {
    const raw = baseValidRaw();
    delete (raw as Record<string, unknown>).verdictRationale;
    const result = validateScoringRaw(raw);
    expect(result.verdictRationale).toBe("Strong ad, ready to launch.");
  });

  it("accepts nested verdict.rationale when flat verdictRationale is missing", () => {
    const raw = baseValidRaw({
      verdictRationale: undefined,
      verdict: { rationale: "Hook earns attention on cold traffic." },
    });
    delete (raw as Record<string, unknown>).verdictRationale;
    const result = validateScoringRaw(raw);
    expect(result.verdictRationale).toBe("Hook earns attention on cold traffic.");
  });
});

describe("resolveVerdictRationale", () => {
  it("prefers explicit verdictRationale over fallbacks", () => {
    expect(
      resolveVerdictRationale(
        { verdictRationale: "Specific reason.", headline: "Headline." },
        "Headline."
      )
    ).toBe("Specific reason.");
  });

  it("falls back to headline when nothing else is available", () => {
    expect(resolveVerdictRationale({}, "Headline summary.")).toBe("Headline summary.");
  });
});

describe("resilient field resolvers", () => {
  it("maps legacy strategicScore to watchThroughScore", () => {
    expect(resolveWatchThroughScore({ strategicScore: 80 })).toBe(40);
  });

  it("maps legacy retentionScore to scrollStopScore when scrollStop is absent", () => {
    expect(resolveScrollStopScore({ retentionScore: 80 })).toBe(32);
  });

  it("builds a script rewrite from hook variants when scriptRewrite is absent", () => {
    const script = resolveScriptRewrite({
      hookVariants: [{ hook: "Stop wasting ad spend on hooks that never convert." }],
    });
    expect(script.length).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// Score calibration — the composite pipeline must meaningfully separate
// creatives of different quality, not collapse everything into 70-85.
// ---------------------------------------------------------------------------

describe("score calibration across the full deterministic composite", () => {
  function composite(scrollStop: number, watchThrough: number, lpScores: number[]) {
    const creativeStrengthScore = computeCreativeStrengthScore(scrollStop, watchThrough);
    const categories: ConversionCategory[] = LANDING_PAGE_CATEGORY_DEFS.map((def, i) => ({
      key: def.key,
      label: def.label,
      maxScore: def.maxScore,
      score: Math.round(def.maxScore * lpScores[i]),
      verdict: "",
      improvement: "",
    }));
    const landingPageTotal = computeLandingPageTotal(categories);
    const overallFunnelScore = computeOverallFunnelScore(creativeStrengthScore, landingPageTotal);
    return { creativeStrengthScore, landingPageTotal, overallFunnelScore };
  }

  it("scores an excellent creative + excellent landing page in the Very Good band (90+)", () => {
    const { overallFunnelScore } = composite(48, 47, [1, 1, 0.9, 1, 0.95, 1, 1]);
    expect(overallFunnelScore).toBeGreaterThanOrEqual(90);
    expect(computeVerdict(overallFunnelScore, "x").label).toBe("LAUNCH");
  });

  it("scores a good creative with minor issues in the Good band (80-89)", () => {
    const { overallFunnelScore } = composite(40, 38, [0.85, 0.8, 0.75, 0.85, 0.8, 0.8, 0.85]);
    expect(overallFunnelScore).toBeGreaterThanOrEqual(80);
    expect(overallFunnelScore).toBeLessThan(90);
  });

  it("scores a mediocre creative in the Mediocre band (70-79)", () => {
    const { overallFunnelScore } = composite(38, 34, [0.75, 0.7, 0.65, 0.75, 0.65, 0.7, 0.75]);
    expect(overallFunnelScore).toBeGreaterThanOrEqual(70);
    expect(overallFunnelScore).toBeLessThan(80);
  });

  it("scores a fundamentally poor creative below 70", () => {
    const { overallFunnelScore } = composite(10, 8, [0.3, 0.2, 0.1, 0.3, 0.2, 0.2, 0.3]);
    expect(overallFunnelScore).toBeLessThan(70);
    expect(computeVerdict(overallFunnelScore, "x").label).not.toBe("LAUNCH");
  });

  it("separates strong-retention/weak-conversion from weak-retention/strong-conversion", () => {
    // Captivating video, weak offer: high creative strength, weak landing page.
    const strongRetentionWeakConversion = composite(45, 44, [0.4, 0.4, 0.3, 0.4, 0.3, 0.4, 0.4]);
    // Boring video, strong offer: low creative strength, strong landing page.
    const weakRetentionStrongConversion = composite(15, 12, [0.9, 0.9, 0.85, 0.9, 0.85, 0.9, 0.9]);

    expect(strongRetentionWeakConversion.creativeStrengthScore).toBeGreaterThan(
      weakRetentionStrongConversion.creativeStrengthScore
    );
    expect(weakRetentionStrongConversion.landingPageTotal).toBeGreaterThan(
      strongRetentionWeakConversion.landingPageTotal
    );

    // Neither dimension should silently cancel the other out — both totals
    // must materially diverge from a "clustered around 75" outcome.
    const spread = Math.abs(
      strongRetentionWeakConversion.overallFunnelScore -
        weakRetentionStrongConversion.overallFunnelScore
    );
    expect(spread).toBeLessThan(15); // similar overall score...
    expect(
      Math.abs(
        strongRetentionWeakConversion.creativeStrengthScore -
          strongRetentionWeakConversion.landingPageTotal
      )
    ).toBeGreaterThan(30); // ...but for very different underlying reasons.
  });

  it("does not cluster every scenario into a narrow 70-85 band", () => {
    const scenarios = [
      composite(48, 47, [1, 1, 0.9, 1, 0.95, 1, 1]).overallFunnelScore, // excellent
      composite(10, 8, [0.3, 0.2, 0.1, 0.3, 0.2, 0.2, 0.3]).overallFunnelScore, // poor
    ];
    const [excellent, poor] = scenarios;
    expect(excellent - poor).toBeGreaterThan(25);
  });
});
