import { describe, expect, it } from "vitest";
import { decideProcessingHeal } from "@/lib/analyses/status-heal";
import { WORKER_RETRIGGER_AFTER_MS } from "@/lib/analyses/worker-constants";
import { ANALYSIS_TIMEOUT_MS } from "@/lib/analyses/watchdog-constants";

const started = "2026-10-23T22:00:00.000Z";
const t0 = Date.parse(started);

describe("decideProcessingHeal", () => {
  it("waits while the worker has locked", () => {
    expect(
      decideProcessingHeal(
        {
          status: "processing",
          worker_locked_at: "2026-10-23T22:00:02.000Z",
          worker_retriggered_at: null,
          processing_started_at: started,
        },
        t0 + 120_000
      )
    ).toBe("wait");
  });

  it("waits during the first 45s even if the lock is missing", () => {
    expect(
      decideProcessingHeal(
        {
          status: "processing",
          worker_locked_at: null,
          worker_retriggered_at: null,
          processing_started_at: started,
        },
        t0 + 30_000
      )
    ).toBe("wait");
  });

  it("retriggers once when processing with no lock after 45s", () => {
    expect(
      decideProcessingHeal(
        {
          status: "processing",
          worker_locked_at: null,
          worker_retriggered_at: null,
          processing_started_at: started,
        },
        t0 + WORKER_RETRIGGER_AFTER_MS
      )
    ).toBe("retrigger");
  });

  it("does not retrigger a second time", () => {
    expect(
      decideProcessingHeal(
        {
          status: "processing",
          worker_locked_at: null,
          worker_retriggered_at: "2026-10-23T22:00:46.000Z",
          processing_started_at: started,
        },
        t0 + 90_000
      )
    ).toBe("wait");
  });

  it("expires only after the real 6-minute timeout", () => {
    expect(
      decideProcessingHeal(
        {
          status: "processing",
          worker_locked_at: null,
          worker_retriggered_at: "2026-10-23T22:00:46.000Z",
          processing_started_at: started,
        },
        t0 + ANALYSIS_TIMEOUT_MS
      )
    ).toBe("expire");
  });

  it("does not heal completed or failed rows", () => {
    expect(
      decideProcessingHeal({
        status: "completed",
        worker_locked_at: null,
        processing_started_at: started,
      })
    ).toBe("wait");
  });
});
