import { describe, expect, it, vi } from "vitest";
import { acquireAnalysisWorkerLock } from "@/lib/analyses/worker-lock";

function mockFrom(handlers: {
  selectResult: { data: unknown; error: { message: string } | null };
  updateResult?: { data: unknown; error: { message: string } | null };
}) {
  const maybeSingle = vi.fn();
  const selectEq2 = vi.fn(() => ({ maybeSingle }));
  const selectEq1 = vi.fn(() => ({ eq: selectEq2, maybeSingle }));
  const select = vi.fn(() => ({ eq: selectEq1, maybeSingle }));

  const updateMaybeSingle = vi.fn();
  const isRetrigger = vi.fn(() => ({ select: () => ({ maybeSingle: updateMaybeSingle }) }));
  const isLock = vi.fn(() => ({
    is: isRetrigger,
    select: () => ({ maybeSingle: updateMaybeSingle }),
  }));
  const updateEq2 = vi.fn(() => ({ is: isLock, eq: vi.fn(() => ({ is: isLock })) }));
  const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
  const update = vi.fn(() => ({ eq: updateEq1 }));

  maybeSingle.mockResolvedValue(handlers.selectResult);
  updateMaybeSingle.mockResolvedValue(
    handlers.updateResult ?? { data: { id: "a1" }, error: null }
  );

  return {
    from: vi.fn(() => ({ select, update })),
    maybeSingle,
    updateMaybeSingle,
  };
}

describe("acquireAnalysisWorkerLock", () => {
  it("acquires when the row is processing and unlocked", async () => {
    const supabase = mockFrom({
      selectResult: {
        data: { id: "a1", status: "processing", worker_locked_at: null },
        error: null,
      },
      updateResult: { data: { id: "a1" }, error: null },
    });

    await expect(
      acquireAnalysisWorkerLock(supabase as never, "a1")
    ).resolves.toBe("acquired");
  });

  it("refuses a second trigger when already locked", async () => {
    const supabase = mockFrom({
      selectResult: {
        data: {
          id: "a1",
          status: "processing",
          worker_locked_at: "2026-10-23T22:00:02.000Z",
        },
        error: null,
      },
    });

    await expect(
      acquireAnalysisWorkerLock(supabase as never, "a1")
    ).resolves.toBe("already_running");
  });

  it("skips completed rows", async () => {
    const supabase = mockFrom({
      selectResult: {
        data: { id: "a1", status: "completed", worker_locked_at: null },
        error: null,
      },
    });

    await expect(
      acquireAnalysisWorkerLock(supabase as never, "a1")
    ).resolves.toBe("not_processing");
  });
});
