import { describe, expect, it } from "vitest";
import { ANALYSIS_TIMEOUT_MESSAGE } from "@/lib/analyses/watchdog-constants";
import { PipelineDeadlineError, withDeadline } from "@/lib/analyses/pipeline-deadline";
import { PIPELINE_DEADLINE_MS } from "@/lib/analyses/worker-constants";

describe("withDeadline", () => {
  it("resolves when the work finishes in time", async () => {
    await expect(withDeadline(Promise.resolve("ok"), 50)).resolves.toBe("ok");
  });

  it("rejects with the public timeout message so the catch can mark failed", async () => {
    await expect(withDeadline(new Promise(() => undefined), 20)).rejects.toBeInstanceOf(
      PipelineDeadlineError
    );
    await expect(withDeadline(new Promise(() => undefined), 20)).rejects.toThrow(
      ANALYSIS_TIMEOUT_MESSAGE
    );
  });

  it("keeps the worker budget under Vercel's 300s hard kill", () => {
    expect(PIPELINE_DEADLINE_MS).toBe(270_000);
    expect(PIPELINE_DEADLINE_MS).toBeLessThan(300_000);
  });
});
