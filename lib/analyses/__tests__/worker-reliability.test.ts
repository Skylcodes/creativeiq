import { afterEach, describe, expect, it, vi } from "vitest";
import { ANALYSIS_TIMEOUT_MS } from "@/lib/analyses/watchdog-constants";
import {
  PIPELINE_DEADLINE_MS,
  WORKER_RETRIGGER_AFTER_MS,
  WORKER_TIMEOUT_MESSAGE,
  decideAndHealProcessingAnalysis,
  shouldExpireAnalysis,
  shouldRetriggerWorker,
  withDeadline,
  type AnalysisWorkerSnapshot,
} from "@/lib/analyses/worker-reliability";

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function row(overrides: Partial<AnalysisWorkerSnapshot> = {}): AnalysisWorkerSnapshot {
  const started = 1_000_000;
  return {
    id: "a1",
    status: "processing",
    error_message: null,
    processing_started_at: iso(started),
    updated_at: iso(started),
    worker_locked_at: null,
    ...overrides,
  };
}

describe("shouldRetriggerWorker", () => {
  const started = Date.parse(row().processing_started_at!);

  it("does not retrigger before 45s", () => {
    expect(shouldRetriggerWorker(row(), started + WORKER_RETRIGGER_AFTER_MS - 1)).toBe(
      false
    );
  });

  it("retriggers once after 45s when the worker never locked", () => {
    expect(shouldRetriggerWorker(row(), started + WORKER_RETRIGGER_AFTER_MS)).toBe(true);
  });

  it("does not retrigger when worker_locked_at is set", () => {
    expect(
      shouldRetriggerWorker(
        row({ worker_locked_at: iso(started + 2_000) }),
        started + WORKER_RETRIGGER_AFTER_MS + 10_000
      )
    ).toBe(false);
  });

  it("does not retrigger after a heal bump (updated_at after start)", () => {
    expect(
      shouldRetriggerWorker(
        row({ updated_at: iso(started + 45_000) }),
        started + WORKER_RETRIGGER_AFTER_MS + 5_000
      )
    ).toBe(false);
  });

  it("does not retrigger a completed or failed row", () => {
    expect(
      shouldRetriggerWorker(row({ status: "completed" }), started + 60_000)
    ).toBe(false);
    expect(shouldRetriggerWorker(row({ status: "failed" }), started + 60_000)).toBe(
      false
    );
  });
});

describe("shouldExpireAnalysis", () => {
  const started = Date.parse(row().processing_started_at!);

  it("does not expire before the watchdog window", () => {
    expect(shouldExpireAnalysis(row(), started + ANALYSIS_TIMEOUT_MS - 1)).toBe(false);
  });

  it("expires after the watchdog window even if updated_at was bumped", () => {
    expect(
      shouldExpireAnalysis(
        row({ updated_at: iso(started + 50_000) }),
        started + ANALYSIS_TIMEOUT_MS
      )
    ).toBe(true);
  });

  it("uses updated_at when processing_started_at is missing", () => {
    const updated = started + 10_000;
    expect(
      shouldExpireAnalysis(
        row({ processing_started_at: null, updated_at: iso(updated) }),
        updated + ANALYSIS_TIMEOUT_MS
      )
    ).toBe(true);
  });

  it("does not expire completed rows", () => {
    expect(
      shouldExpireAnalysis(row({ status: "completed" }), started + ANALYSIS_TIMEOUT_MS)
    ).toBe(false);
  });
});

describe("decideAndHealProcessingAnalysis", () => {
  it("expires before considering a retrigger when the row is past timeout", async () => {
    const started = Date.parse(row().processing_started_at!);
    const trigger = vi.fn();
    const markRetriggered = vi.fn().mockResolvedValue(true);
    const expire = vi.fn().mockResolvedValue(undefined);

    const action = await decideAndHealProcessingAnalysis({
      row: row(),
      nowMs: started + ANALYSIS_TIMEOUT_MS,
      markRetriggered,
      expire,
      trigger,
    });

    expect(action).toBe("expire");
    expect(expire).toHaveBeenCalledOnce();
    expect(trigger).not.toHaveBeenCalled();
    expect(markRetriggered).not.toHaveBeenCalled();
  });

  it("retriggers once when markRetriggered wins the compare-and-swap", async () => {
    const started = Date.parse(row().processing_started_at!);
    const trigger = vi.fn();
    const markRetriggered = vi.fn().mockResolvedValue(true);
    const expire = vi.fn();

    const action = await decideAndHealProcessingAnalysis({
      row: row(),
      nowMs: started + WORKER_RETRIGGER_AFTER_MS,
      markRetriggered,
      expire,
      trigger,
    });

    expect(action).toBe("retrigger");
    expect(markRetriggered).toHaveBeenCalledOnce();
    expect(trigger).toHaveBeenCalledOnce();
    expect(expire).not.toHaveBeenCalled();
  });

  it("does not double-trigger when another poll already marked retriggered", async () => {
    const started = Date.parse(row().processing_started_at!);
    const trigger = vi.fn();

    const action = await decideAndHealProcessingAnalysis({
      row: row(),
      nowMs: started + WORKER_RETRIGGER_AFTER_MS,
      markRetriggered: async () => false,
      expire: async () => undefined,
      trigger,
    });

    expect(action).toBe("none");
    expect(trigger).not.toHaveBeenCalled();
  });
});

describe("withDeadline", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves when work finishes before the deadline", async () => {
    await expect(withDeadline(Promise.resolve("ok"), 50)).resolves.toBe("ok");
  });

  it("rejects with the timeout message when work exceeds the budget", async () => {
    vi.useFakeTimers();
    const pending = withDeadline(new Promise<string>(() => undefined), PIPELINE_DEADLINE_MS);
    const assertion = expect(pending).rejects.toThrow(WORKER_TIMEOUT_MESSAGE);
    await vi.advanceTimersByTimeAsync(PIPELINE_DEADLINE_MS);
    await assertion;
  });
});

describe("watchdog constants", () => {
  it("uses a 6 minute client/watchdog timeout", () => {
    expect(ANALYSIS_TIMEOUT_MS).toBe(6 * 60 * 1000);
  });

  it("self-aborts at 270s and retriggers after 45s", () => {
    expect(PIPELINE_DEADLINE_MS).toBe(270_000);
    expect(WORKER_RETRIGGER_AFTER_MS).toBe(45_000);
  });
});
