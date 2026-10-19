import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "lib/ai");

function read(name: string) {
  return readFileSync(join(root, name), "utf8");
}

describe("evaluation principles single source of truth", () => {
  it("keeps CORE_ACCURACY_RULES and SCORE_BAND only in evaluation-principles.ts", () => {
    const principles = read("evaluation-principles.ts");
    const pipelinePrompts = read("pipeline-prompts.ts");
    const prompts = read("prompts.ts");

    expect(principles).toContain("export const CORE_ACCURACY_RULES");
    expect(principles).toContain("export const SCORE_BAND_CALIBRATION");
    expect(principles).toContain("90-100 VERY GOOD");

    // No forked band legend in feature prompt files
    expect(prompts).not.toContain("90–100 EXCEPTIONAL");
    expect(pipelinePrompts).not.toContain("1. NO HALLUCINATIONS");
    expect(pipelinePrompts).toContain('from "@/lib/ai/evaluation-principles"');
    expect(prompts).toContain('from "@/lib/ai/evaluation-principles"');
  });

  it("wires Compare, Briefs, and Deconstructor to shared principles", () => {
    const prompts = read("prompts.ts");
    const decon = read("deconstruction-prompts.ts");

    expect(prompts).toContain("${CORE_ACCURACY_RULES}");
    expect(prompts).toContain("CREATIVE_JUDGMENT_FOR_GENERATION");
    expect(decon).toContain("CORE_ACCURACY_RULES");
    expect(decon).toContain('from "@/lib/ai/evaluation-principles"');
  });

  it("injects creative-goal evaluation into Analysis evidence context", () => {
    const pipeline = read("pipeline.ts");
    expect(pipeline).toContain("getCreativeGoalEvaluationBlock");
    expect(pipeline).toContain("creativeGoalEvaluationBlock");
  });
});
