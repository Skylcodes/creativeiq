import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SCORING_CREATIVE_KEYS,
  SCORING_GRADE_KEYS,
  SCORING_INSIGHT_KEYS,
  mergeScoringPartials,
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

  it("launches the three sub-calls in parallel and merges exclusive keys", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    mockedCall.mockImplementation(async (options) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 25));
      inFlight -= 1;

      const prompt = options.prompt;
      if (prompt.includes("scrollStopScore")) {
        return {
          scrollStopScore: 31,
          watchThroughScore: 29,
          retentionScore: 60,
          headline: "headline",
          verdictRationale: "rationale",
          scriptRewrite: "grades-must-not-win",
        };
      }
      if (prompt.includes("topFindings")) {
        return { topFindings: [], priorityActions: [], agentFindings: [] };
      }
      return {
        scriptRewrite: "from-creative",
        hookVariants: [{ rank: 1, hook: "h", rationale: "r" }],
        scrollStopScore: 1,
      };
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
    expect(result.scriptRewrite).toBe("from-creative");
    expect(result.topFindings).toEqual([]);
    expect(result.hookVariants).toHaveLength(1);

    for (const call of mockedCall.mock.calls) {
      expect(call[0].temperature).toBe(0.2);
      expect(call[0].grading).toBe(true);
      expect(call[0].timeoutMs).toBeGreaterThan(0);
    }
  });

  it("uses insights/creative successes when those calls fail (grades still required)", async () => {
    mockedCall.mockImplementation(async (options) => {
      const prompt = options.prompt;
      if (prompt.includes("scrollStopScore")) {
        return { scrollStopScore: 22, watchThroughScore: 20, headline: "kept" };
      }
      if (prompt.includes("topFindings")) {
        throw new Error("insights timeout");
      }
      throw new Error("creative timeout");
    });

    const result = await runParallelScoringCalls({
      cachedContext: "ctx",
      prompt: "Score this ad.",
    });

    expect(result.scrollStopScore).toBe(22);
    expect(result.headline).toBe("kept");
    expect(result.topFindings).toBeUndefined();
    expect(result.scriptRewrite).toBeUndefined();
  });

  it("throws when the grades call fails, even if the others succeed", async () => {
    mockedCall.mockImplementation(async (options) => {
      if (options.prompt.includes("scrollStopScore")) {
        throw new Error("grades failed");
      }
      return { topFindings: [], scriptRewrite: "unused" };
    });

    await expect(
      runParallelScoringCalls({ cachedContext: "ctx", prompt: "Score this ad." })
    ).rejects.toThrow("grades failed");
  });
});
