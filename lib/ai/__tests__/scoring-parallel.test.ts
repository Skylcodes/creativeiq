import { beforeEach, describe, expect, it, vi } from "vitest";
import { SCORING_SYSTEM } from "@/lib/ai/pipeline-prompts";
import {
  HOOK_ANGLE_MAX_TOKENS,
  HOOK_ANGLE_TIMEOUT_MS,
  SCRIPT_ICP_MAX_TOKENS,
  SCRIPT_ICP_TIMEOUT_MS,
  SCORING_CREATIVE_KEYS,
  SCORING_GRADE_KEYS,
  SCORING_HOOK_ANGLE_KEYS,
  SCORING_INSIGHT_KEYS,
  SCORING_SCRIPT_ICP_KEYS,
  countFilledAngles,
  countFilledHooks,
  errorDetail,
  evaluateCreativeOutput,
  mergeScoringPartials,
  originalCreativeFieldInstructions,
  originalHookAngleInstructions,
  originalSchemaSubset,
  originalScriptIcpInstructions,
  pickDefinedKeys,
  retryOnce,
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

function validHookAngle(overrides: Record<string, unknown> = {}) {
  return {
    angleRecommendations: validAngles(3),
    hookVariants: validHooks(3),
    ...overrides,
  };
}

function validScriptIcp(overrides: Record<string, unknown> = {}) {
  return {
    scriptRewrite: VALID_SCRIPT,
    icpSimulation: {
      personas: [{ id: "a", title: "Aware", likelihood: "High", summary: "s", narrative: "n" }],
    },
    ...overrides,
  };
}

function validCreative(overrides: Record<string, unknown> = {}) {
  return {
    ...validHookAngle(),
    ...validScriptIcp(),
    ...overrides,
  };
}

function isGradesPrompt(prompt: string): boolean {
  return prompt.includes("CREATIVE STRENGTH —") && prompt.includes("landingPageCategories");
}

function isInsightsPrompt(prompt: string): boolean {
  return prompt.includes("TOP FINDINGS —") && prompt.includes("agentFindings");
}

function isHookAnglePrompt(prompt: string): boolean {
  return (
    prompt.includes("HOOK VARIANTS — 3-5 alternatives") &&
    prompt.includes("angleRecommendations") &&
    !prompt.includes("scriptRewrite")
  );
}

function isScriptIcpPrompt(prompt: string): boolean {
  return (
    prompt.includes("SCRIPT REWRITE —") &&
    prompt.includes("scriptRewrite") &&
    !prompt.includes("hookVariants")
  );
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

  it("splits hook/angle vs script/icp on the original markers", () => {
    const hooks = originalHookAngleInstructions();
    const script = originalScriptIcpInstructions();
    expect(hooks.startsWith("ANGLE RECOMMENDATIONS —")).toBe(true);
    expect(hooks).toContain("HOOK VARIANTS — 3-5 alternatives");
    expect(hooks).not.toContain("SCRIPT REWRITE —");
    expect(script.startsWith("SCRIPT REWRITE —")).toBe(true);
    expect(script).toContain("ICP SIMULATION — exactly 3 personas");
    expect(script).not.toContain("HOOK VARIANTS —");
    expect(`${hooks}\n\n${script}`).toBe(originalCreativeFieldInstructions());
    expect(SCORING_SYSTEM).toContain(hooks);
    expect(SCORING_SYSTEM).toContain(script);
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
    expect(originalSchemaSubset(SCORING_HOOK_ANGLE_KEYS)).not.toContain("scriptRewrite");
    expect(originalSchemaSubset(SCORING_SCRIPT_ICP_KEYS)).not.toContain("hookVariants");
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

describe("retryOnce", () => {
  it("returns the first success without a second attempt", async () => {
    const run = vi.fn().mockResolvedValue({ ok: true });
    const value = await retryOnce("an_ok", "hooks", run, () => ({
      ok: true,
      reasons: [],
    }));
    expect(value).toEqual({ ok: true });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("retries once on throw and keeps the retry", async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection error."))
      .mockResolvedValueOnce({ ok: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const value = await retryOnce("an_throw", "script", run, () => ({
      ok: true,
      reasons: [],
    }));
    const retryLog = warn.mock.calls.some((c) =>
      String(c[0]).includes("threw: Connection error.")
    );
    warn.mockRestore();
    expect(value).toEqual({ ok: true });
    expect(run).toHaveBeenCalledTimes(2);
    expect(retryLog).toBe(true);
  });

  it("retries once on invalid output and logs the validation reason", async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ bad: true })
      .mockResolvedValueOnce({ ok: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const value = await retryOnce("an_invalid", "hooks", run, (raw) =>
      raw && typeof raw === "object" && "ok" in raw
        ? { ok: true, reasons: [] }
        : { ok: false, reasons: ["hookVariants 0 < 3"] }
    );
    const retryLog = warn.mock.calls.some((c) =>
      String(c[0]).includes("hookVariants 0 < 3")
    );
    warn.mockRestore();
    expect(value).toEqual({ ok: true });
    expect(retryLog).toBe(true);
  });

  it("logs the error message in the fallback line when retry still throws", async () => {
    const run = vi.fn().mockRejectedValue(new Error("Request timed out."));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      retryOnce("an_fail", "script", run, () => ({ ok: true, reasons: [] }))
    ).rejects.toThrow("Request timed out.");
    const fallback = warn.mock.calls.some(
      (c) =>
        String(c[0]).includes("[worker] scoring fallback:") &&
        String(c[0]).includes("threw: Request timed out.")
    );
    warn.mockRestore();
    expect(fallback).toBe(true);
    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe("errorDetail", () => {
  it("reads Error.message so fallback logs are not silent", () => {
    expect(errorDetail(new Error("Connection error."))).toBe("Connection error.");
    expect(errorDetail("bare")).toBe("bare");
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

  it("launches four sub-calls in parallel with split creative budgets", async () => {
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
      if (isHookAnglePrompt(prompt)) {
        return validHookAngle({ hookVariants: validHooks(5) });
      }
      return validScriptIcp();
    });

    const result = await runParallelScoringCalls({
      cachedContext: "ctx",
      prompt: "Score this ad now using the evidence above. Output the complete JSON report.",
      analysisId: "an_test",
    });

    expect(mockedCall).toHaveBeenCalledTimes(4);
    expect(maxInFlight).toBe(4);
    expect(result.scrollStopScore).toBe(31);
    expect(result.watchThroughScore).toBe(29);
    expect(result.scriptRewrite).toBe(VALID_SCRIPT);
    expect(result.topFindings).toEqual([]);
    expect(result.hookVariants).toHaveLength(5);

    const hookCall = mockedCall.mock.calls.find((call) =>
      isHookAnglePrompt(call[0].prompt)
    );
    const scriptCall = mockedCall.mock.calls.find((call) =>
      isScriptIcpPrompt(call[0].prompt)
    );
    expect(hookCall?.[0].maxTokens).toBe(HOOK_ANGLE_MAX_TOKENS);
    expect(hookCall?.[0].timeoutMs).toBe(HOOK_ANGLE_TIMEOUT_MS);
    expect(hookCall?.[0].retry).toBe(false);
    expect(hookCall?.[0].temperature).toBe(0.2);
    expect(hookCall?.[0].grading).toBe(true);
    expect(hookCall?.[0].prompt).toContain("ANGLE RECOMMENDATIONS —");
    expect(hookCall?.[0].prompt).toContain("HOOK VARIANTS — 3-5 alternatives");
    expect(hookCall?.[0].system).toBe(SCORING_SYSTEM);

    expect(scriptCall?.[0].maxTokens).toBe(SCRIPT_ICP_MAX_TOKENS);
    expect(scriptCall?.[0].timeoutMs).toBe(SCRIPT_ICP_TIMEOUT_MS);
    expect(scriptCall?.[0].retry).toBe(false);
    expect(scriptCall?.[0].prompt).toContain("SCRIPT REWRITE —");
    expect(scriptCall?.[0].prompt).toContain("ICP SIMULATION — exactly 3 personas");
    expect(HOOK_ANGLE_MAX_TOKENS).toBe(3072);
    expect(SCRIPT_ICP_MAX_TOKENS).toBe(4096);
    expect(HOOK_ANGLE_TIMEOUT_MS).toBe(70_000);
    expect(SCRIPT_ICP_TIMEOUT_MS).toBe(70_000);
  });

  it("retries hooks once when the first attempt throws, then keeps the retry", async () => {
    let hookAttempts = 0;
    mockedCall.mockImplementation(async (options) => {
      if (isGradesPrompt(options.prompt)) {
        return { scrollStopScore: 22, watchThroughScore: 20, headline: "kept" };
      }
      if (isInsightsPrompt(options.prompt)) {
        return { topFindings: [], priorityActions: [], agentFindings: [] };
      }
      if (isHookAnglePrompt(options.prompt)) {
        hookAttempts += 1;
        if (hookAttempts === 1) throw new Error("Connection error.");
        return validHookAngle({ hookVariants: validHooks(4) });
      }
      return validScriptIcp();
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runParallelScoringCalls({
      cachedContext: "ctx",
      prompt: "Score this ad.",
      analysisId: "an_retry_throw",
    });
    const warnedThrow = warn.mock.calls.some((c) =>
      String(c[0]).includes("threw: Connection error.")
    );
    warn.mockRestore();

    expect(hookAttempts).toBe(2);
    expect(result.hookVariants).toHaveLength(4);
    expect(result.scriptRewrite).toBe(VALID_SCRIPT);
    expect(warnedThrow).toBe(true);
  });

  it("retries script once when the first payload is invalid, then keeps the valid retry", async () => {
    let scriptAttempts = 0;
    mockedCall.mockImplementation(async (options) => {
      if (isGradesPrompt(options.prompt)) {
        return { scrollStopScore: 22, watchThroughScore: 20, headline: "kept" };
      }
      if (isInsightsPrompt(options.prompt)) {
        return { topFindings: [], priorityActions: [], agentFindings: [] };
      }
      if (isHookAnglePrompt(options.prompt)) {
        return validHookAngle();
      }
      scriptAttempts += 1;
      if (scriptAttempts === 1) {
        return { scriptRewrite: "The sell-out claim at ~0:37 —" };
      }
      return validScriptIcp();
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runParallelScoringCalls({
      cachedContext: "ctx",
      prompt: "Score this ad.",
      analysisId: "an_retry",
    });
    const warnedInvalid = warn.mock.calls.some((c) =>
      String(c[0]).includes("[worker] scoring.script failed, retrying once")
    );
    warn.mockRestore();

    expect(scriptAttempts).toBe(2);
    expect(result.scriptRewrite).toBe(VALID_SCRIPT);
    expect(warnedInvalid).toBe(true);
  });

  it("logs a [worker] fallback warning with the error reason when retry still fails", async () => {
    mockedCall.mockImplementation(async (options) => {
      if (isGradesPrompt(options.prompt)) {
        return { scrollStopScore: 22, watchThroughScore: 20, headline: "kept" };
      }
      if (isInsightsPrompt(options.prompt)) {
        return { topFindings: [], priorityActions: [], agentFindings: [] };
      }
      if (isHookAnglePrompt(options.prompt)) {
        return validHookAngle();
      }
      throw new Error("Request timed out.");
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runParallelScoringCalls({
      cachedContext: "ctx",
      prompt: "Score this ad.",
      analysisId: "an_fallback",
    });

    expect(result.scrollStopScore).toBe(22);
    expect(result.hookVariants).toHaveLength(3);
    expect(result.scriptRewrite).toBeUndefined();
    expect(
      warn.mock.calls.some(
        (c) =>
          String(c[0]).includes("[worker] scoring fallback:") &&
          String(c[0]).includes("Request timed out.")
      )
    ).toBe(true);
    warn.mockRestore();
  });

  it("keeps the other creative half when only one sub-call fails", async () => {
    mockedCall.mockImplementation(async (options) => {
      if (isGradesPrompt(options.prompt)) {
        return { scrollStopScore: 22, watchThroughScore: 20, headline: "kept" };
      }
      if (isInsightsPrompt(options.prompt)) {
        return { topFindings: [], priorityActions: [], agentFindings: [] };
      }
      if (isHookAnglePrompt(options.prompt)) {
        throw new Error("hooks timeout");
      }
      return validScriptIcp();
    });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await runParallelScoringCalls({
      cachedContext: "ctx",
      prompt: "Score this ad.",
      analysisId: "an_half",
    });
    warn.mockRestore();

    expect(result.scrollStopScore).toBe(22);
    expect(result.scriptRewrite).toBe(VALID_SCRIPT);
    expect(result.hookVariants).toBeUndefined();
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
    const loggedReason = warn.mock.calls.some((c) =>
      String(c[0]).includes("subcall timeout")
    );
    warn.mockRestore();

    expect(result.scrollStopScore).toBe(22);
    expect(result.headline).toBe("kept");
    expect(result.topFindings).toBeUndefined();
    expect(result.scriptRewrite).toBeUndefined();
    expect(loggedReason).toBe(true);
  });

  it("throws when the grades call fails, even if the others succeed", async () => {
    mockedCall.mockImplementation(async (options) => {
      if (isGradesPrompt(options.prompt)) {
        throw new Error("grades failed");
      }
      if (isInsightsPrompt(options.prompt)) {
        return { topFindings: [] };
      }
      if (isHookAnglePrompt(options.prompt)) {
        return validHookAngle();
      }
      return validScriptIcp();
    });

    await expect(
      runParallelScoringCalls({ cachedContext: "ctx", prompt: "Score this ad." })
    ).rejects.toThrow("grades failed");
  });
});
