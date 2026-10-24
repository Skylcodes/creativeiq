import { beforeEach, describe, expect, it, vi } from "vitest";
import { SCORING_SYSTEM } from "@/lib/ai/pipeline-prompts";
import {
  CREATIVE_MAX_TOKENS,
  SCORING_CREATIVE_KEYS,
  SCORING_GRADE_KEYS,
  SCORING_INSIGHT_KEYS,
  countFilledAngles,
  countFilledHooks,
  evaluateCreativeOutput,
  mergeScoringPartials,
  originalCreativeFieldInstructions,
  originalSchemaSubset,
  pickDefinedKeys,
  runParallelScoringCalls,
} from "@/lib/ai/scoring-parallel";

vi.mock("@/lib/ai/client", () => ({
  CLAUDE_MODEL: "claude-sonnet-4-6",
  callClaudeJSON: vi.fn(),
}));

vi.mock("@/lib/analyses/worker-reliability", () => ({
  logWorkerStage: (_stage: string, _id: string, work: () => Promise<unknown>) =>
    work(),
}));

import { callClaudeJSON } from "@/lib/ai/client";

const mockedCall = vi.mocked(callClaudeJSON);

const VALID_SCRIPT = [
  "You know that moment when an ad talks for twenty seconds and you still cannot tell what they sell?",
  "That is the problem. I show the product in the first two seconds, then I tell you exactly what it does for you.",
  "No logo open, no mystery. If you want the same result, tap through and start today.",
  "",
  "Production note: UGC talking head, natural light, direct to camera. Opening frame: creator delivers the hook in the first two seconds.",
].join(" ");

function validHooks(n = 3) {
  return Array.from({ length: n }, (_, i) => ({
    rank: i + 1,
    hook: `Hook ${i + 1}: stop scrolling if you waste ad spend.`,
    rationale: "Specific to this product.",
    predictedPerformance: "high" as const,
  }));
}

function validAngles(n = 3) {
  return Array.from({ length: n }, (_, i) => ({
    rank: i + 1,
    angle: `Angle ${i + 1}`,
    rationale: "Tied to this audience.",
    angleTags: ["Transformation"],
  }));
}

function validCreative(overrides: Record<string, unknown> = {}) {
  return {
    angleRecommendations: validAngles(3),
    hookVariants: validHooks(3),
    scriptRewrite: VALID_SCRIPT,
    icpSimulation: { personas: [{ id: "a", title: "Aware", likelihood: "High", summary: "s", narrative: "n" }] },
    ...overrides,
  };
}

function isGradesPrompt(prompt: string): boolean {
  return prompt.includes("CREATIVE STRENGTH —") && prompt.includes("landingPageCategories");
}

function isInsightsPrompt(prompt: string): boolean {
  return prompt.includes("TOP FINDINGS —") && prompt.includes("agentFindings");
}

function isCreativePrompt(prompt: string): boolean {
  return prompt.includes("HOOK VARIANTS") && prompt.includes("scriptRewrite");
}

describe("original field instructions stay aligned with SCORING_SYSTEM", () => {
  it("extracts the original ANGLE / HOOK / SCRIPT / ICP wording unchanged", () => {
    const section = originalCreativeFieldInstructions();
    expect(section.startsWith("ANGLE RECOMMENDATIONS —")).toBe(true);
    expect(section).toContain("HOOK VARIANTS — 3-5 alternatives");
    expect(section).toContain("SCRIPT REWRITE —");
    expect(section).toContain("ICP SIMULATION — exactly 3 personas");
    expect(SCORING_SYSTEM).toContain(section);
  });

  it("uses the original JSON schema subset for creative keys", () => {
    const schema = originalSchemaSubset(SCORING_CREATIVE_KEYS);
    expect(schema).toContain('"angleRecommendations"');
    expect(schema).toContain('"hookVariants"');
    expect(schema).toContain('"scriptRewrite"');
    expect(schema).toContain('"icpSimulation"');
    expect(schema).not.toContain("scrollStopScore");
    expect(SCORING_SYSTEM).toContain(
      '"scriptRewrite": "80+ word spoken script ending with a single \'Production note:\' line"'
    );
  });
});

describe("evaluateCreativeOutput", () => {
  it("accepts a complete creative payload", () => {
    const result = evaluateCreativeOutput(validCreative());
    expect(result.ok).toBe(true);
    expect(result.hookCount).toBe(3);
    expect(result.angleCount).toBe(3);
  });

  it("rejects the production truncated-analysis scriptRewrite", () => {
    const result = evaluateCreativeOutput({
      hookVariants: validHooks(5),
      angleRecommendations: validAngles(3),
      scriptRewrite: "The sell-out claim at ~0:37 —",
    });
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes("scriptRewrite"))).toBe(true);
  });

  it("rejects hook counts below 3 and angle counts below 2", () => {
    const result = evaluateCreativeOutput({
      hookVariants: validHooks(0),
      angleRecommendations: validAngles(1),
      scriptRewrite: VALID_SCRIPT,
    });
    expect(result.ok).toBe(false);
    expect(result.hookCount).toBe(0);
    expect(result.angleCount).toBe(1);
    expect(countFilledHooks({ hookVariants: [] })).toBe(0);
    expect(countFilledAngles({ angleRecommendations: validAngles(1) })).toBe(1);
  });

  it("rejects a long grader-analysis script that is not spoken copy", () => {
    const analysis = [
      "The opening is a static talking head with no pattern interrupt.",
      "A cold viewer would keep scrolling before the sell-out claim at ~0:37 lands.",
      "Watch-through quality is hurt by a drop-off moment around the report card.",
      "RetentionScore should stay near 62 given these Gemini signals.",
    ].join(" ");
    const result = evaluateCreativeOutput({
      hookVariants: validHooks(3),
      angleRecommendations: validAngles(3),
      scriptRewrite: analysis,
    });
    expect(result.ok).toBe(false);
  });
});

describe("pickDefinedKeys / mergeScoringPartials", () => {
  it("keeps only the requested keys so a verbose model cannot overwrite grades", () => {
    const raw = {
      scrollStopScore: 32,
      watchThroughScore: 30,
      scriptRewrite: "should-not-land-in-grades",
      extra: true,
    };
    expect(pickDefinedKeys(raw, SCORING_GRADE_KEYS)).toEqual({
      scrollStopScore: 32,
      watchThroughScore: 30,
    });
    expect(pickDefinedKeys(raw, SCORING_CREATIVE_KEYS)).toEqual({
      scriptRewrite: "should-not-land-in-grades",
    });
  });

  it("merges exclusive partials into one scoring object", () => {
    const merged = mergeScoringPartials([
      pickDefinedKeys(
        { scrollStopScore: 28, headline: "ok", scriptRewrite: "ignore" },
        SCORING_GRADE_KEYS
      ),
      pickDefinedKeys(
        { topFindings: [{ title: "a" }], scrollStopScore: 99 },
        SCORING_INSIGHT_KEYS
      ),
      pickDefinedKeys(
        { scriptRewrite: "spoken rewrite", hookVariants: [] },
        SCORING_CREATIVE_KEYS
      ),
    ]);

    expect(merged.scrollStopScore).toBe(28);
    expect(merged.headline).toBe("ok");
    expect(merged.topFindings).toEqual([{ title: "a" }]);
    expect(merged.scriptRewrite).toBe("spoken rewrite");
    expect(merged.hookVariants).toEqual([]);
  });
});

describe("runParallelScoringCalls", () => {
  beforeEach(() => {
    mockedCall.mockReset();
  });

  it("launches the three sub-calls in parallel and gives creative the original 8192-token budget", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    mockedCall.mockImplementation(async (options) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 25));
      inFlight -= 1;

      const prompt = options.prompt;
      if (isGradesPrompt(prompt)) {
        return {
          scrollStopScore: 31,
          watchThroughScore: 29,
          retentionScore: 60,
          headline: "headline",
          verdictRationale: "rationale",
          scriptRewrite: "grades-must-not-win",
        };
      }
      if (isInsightsPrompt(prompt)) {
        return { topFindings: [], priorityActions: [], agentFindings: [] };
      }
      return validCreative({
        hookVariants: validHooks(5),
        scriptRewrite: VALID_SCRIPT,
      });
    });

    const result = await runParallelScoringCalls({
      cachedContext: "ctx",
      prompt: "Score this ad now using the evidence above. Output the complete JSON report.",
      analysisId: "an_test",
    });

    expect(mockedCall).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBe(3);
    expect(result.scrollStopScore).toBe(31);
    expect(result.watchThroughScore).toBe(29);
    expect(result.scriptRewrite).toBe(VALID_SCRIPT);
    expect(result.topFindings).toEqual([]);
    expect(result.hookVariants).toHaveLength(5);

    const creativeCall = mockedCall.mock.calls.find((call) =>
      isCreativePrompt(call[0].prompt)
    );
    expect(creativeCall?.[0].maxTokens).toBe(CREATIVE_MAX_TOKENS);
    expect(CREATIVE_MAX_TOKENS).toBe(8192);
    expect(creativeCall?.[0].temperature).toBe(0.2);
    expect(creativeCall?.[0].grading).toBe(true);
    expect(creativeCall?.[0].prompt).toContain("ANGLE RECOMMENDATIONS —");
    expect(creativeCall?.[0].prompt).toContain("HOOK VARIANTS — 3-5 alternatives");
    expect(creativeCall?.[0].system).toBe(SCORING_SYSTEM);
  });

  it("retries creative once when hooks/script are invalid, then keeps the valid retry", async () => {
    let creativeAttempts = 0;
    mockedCall.mockImplementation(async (options) => {
      if (isGradesPrompt(options.prompt)) {
        return { scrollStopScore: 22, watchThroughScore: 20, headline: "kept" };
      }
      if (isInsightsPrompt(options.prompt)) {
        return { topFindings: [], priorityActions: [], agentFindings: [] };
      }
      creativeAttempts += 1;
      if (creativeAttempts === 1) {
        return {
          hookVariants: [],
          angleRecommendations: validAngles(1),
          scriptRewrite: "The sell-out claim at ~0:37 —",
        };
      }
      return validCreative({ hookVariants: validHooks(4) });
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runParallelScoringCalls({
      cachedContext: "ctx",
      prompt: "Score this ad.",
      analysisId: "an_retry",
    });
    const warnedInvalid = warn.mock.calls.some((c) =>
      String(c[0]).includes("[worker] scoring.creative invalid")
    );
    warn.mockRestore();

    expect(creativeAttempts).toBe(2);
    expect(result.hookVariants).toHaveLength(4);
    expect(result.scriptRewrite).toBe(VALID_SCRIPT);
    expect(warnedInvalid).toBe(true);
  });

  it("logs a [worker] fallback warning and omits creative keys when retry still fails", async () => {
    mockedCall.mockImplementation(async (options) => {
      if (isGradesPrompt(options.prompt)) {
        return { scrollStopScore: 22, watchThroughScore: 20, headline: "kept" };
      }
      if (isInsightsPrompt(options.prompt)) {
        return { topFindings: [], priorityActions: [], agentFindings: [] };
      }
      return {
        hookVariants: [],
        angleRecommendations: [],
        scriptRewrite: "The sell-out claim at ~0:37 —",
      };
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runParallelScoringCalls({
      cachedContext: "ctx",
      prompt: "Score this ad.",
      analysisId: "an_fallback",
    });

    expect(result.scrollStopScore).toBe(22);
    expect(result.scriptRewrite).toBeUndefined();
    expect(result.hookVariants).toBeUndefined();
    expect(
      warn.mock.calls.some((c) =>
        String(c[0]).includes("[worker] scoring fallback:")
      )
    ).toBe(true);
    warn.mockRestore();
  });

  it("uses insights/creative successes when those calls fail (grades still required)", async () => {
    mockedCall.mockImplementation(async (options) => {
      if (isGradesPrompt(options.prompt)) {
        return { scrollStopScore: 22, watchThroughScore: 20, headline: "kept" };
      }
      throw new Error("subcall timeout");
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runParallelScoringCalls({
      cachedContext: "ctx",
      prompt: "Score this ad.",
    });
    warn.mockRestore();

    expect(result.scrollStopScore).toBe(22);
    expect(result.headline).toBe("kept");
    expect(result.topFindings).toBeUndefined();
    expect(result.scriptRewrite).toBeUndefined();
  });

  it("throws when the grades call fails, even if the others succeed", async () => {
    mockedCall.mockImplementation(async (options) => {
      if (isGradesPrompt(options.prompt)) {
        throw new Error("grades failed");
      }
      if (isInsightsPrompt(options.prompt)) {
        return { topFindings: [] };
      }
      return validCreative();
    });

    await expect(
      runParallelScoringCalls({ cachedContext: "ctx", prompt: "Score this ad." })
    ).rejects.toThrow("grades failed");
  });
});
