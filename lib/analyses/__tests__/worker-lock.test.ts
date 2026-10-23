import { describe, expect, it } from "vitest";
import { claimAnalysisWorkerLock } from "@/lib/analyses/worker-lock";

type Row = {
  id: string;
  status: string;
  worker_locked_at: string | null;
};

function createFakeClient(row: Row) {
  const state = { row, updates: [] as Record<string, unknown>[] };

  const query = {
    _filters: [] as Array<{ op: string; col: string; val: unknown }>,
    update(values: Record<string, unknown>) {
      state.updates.push(values);
      this._pending = values;
      return this;
    },
    eq(col: string, val: unknown) {
      this._filters.push({ op: "eq", col, val });
      return this;
    },
    is(col: string, val: unknown) {
      this._filters.push({ op: "is", col, val });
      return this;
    },
    select() {
      return this;
    },
    async maybeSingle() {
      const matches = this._filters.every((filter) => {
        const current = (state.row as Record<string, unknown>)[filter.col];
        if (filter.op === "is") return current === filter.val;
        return current === filter.val;
      });
      if (!matches) return { data: null, error: null };
      Object.assign(state.row, this._pending);
      return { data: { id: state.row.id }, error: null };
    },
    _pending: {} as Record<string, unknown>,
  };

  return {
    state,
    from(table: string) {
      expect(table).toBe("analyses");
      return query;
    },
  };
}

describe("claimAnalysisWorkerLock", () => {
  it("claims an unlocked processing row", async () => {
    const client = createFakeClient({
      id: "a1",
      status: "processing",
      worker_locked_at: null,
    });

    const claimed = await claimAnalysisWorkerLock(client, "a1", "2026-10-23T00:00:00.000Z");

    expect(claimed).toBe(true);
    expect(client.state.row.worker_locked_at).toBe("2026-10-23T00:00:00.000Z");
  });

  it("refuses a second claim when the lock is already set", async () => {
    const client = createFakeClient({
      id: "a1",
      status: "processing",
      worker_locked_at: "2026-10-23T00:00:00.000Z",
    });

    const claimed = await claimAnalysisWorkerLock(client, "a1", "2026-10-23T00:01:00.000Z");

    expect(claimed).toBe(false);
    expect(client.state.row.worker_locked_at).toBe("2026-10-23T00:00:00.000Z");
  });

  it("can be claimed again after a retry clears the lock", async () => {
    const client = createFakeClient({
      id: "a1",
      status: "processing",
      worker_locked_at: "2026-10-23T00:00:00.000Z",
    });

    expect(await claimAnalysisWorkerLock(client, "a1", "2026-10-23T00:02:00.000Z")).toBe(
      false
    );

    client.state.row.worker_locked_at = null;
    expect(await claimAnalysisWorkerLock(client, "a1", "2026-10-23T00:02:00.000Z")).toBe(
      true
    );
  });

  it("refuses to claim a completed row", async () => {
    const client = createFakeClient({
      id: "a1",
      status: "completed",
      worker_locked_at: null,
    });

    await expect(
      claimAnalysisWorkerLock(client, "a1", "2026-10-23T00:00:00.000Z")
    ).resolves.toBe(false);
  });
});
