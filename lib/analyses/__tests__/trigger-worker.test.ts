import { afterEach, describe, expect, it, vi } from "vitest";

const afterMock = vi.fn((task: () => Promise<void>) => {
  void task();
});

vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => afterMock(task),
}));

vi.mock("@/lib/internal-auth", () => ({
  getAppOrigin: () => "https://example.com",
  getInternalSecretHeader: () => ({ "x-internal-secret": "test-secret" }),
}));

import { triggerBackgroundWorker } from "@/lib/trigger-worker";

describe("triggerBackgroundWorker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    afterMock.mockClear();
  });

  it("schedules the worker fetch with after() so Vercel cannot drop it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    triggerBackgroundWorker(
      new Request("https://example.com/api/analyses/a1/run"),
      "/api/analyses/a1/worker"
    );

    expect(afterMock).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/analyses/a1/worker",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-internal-secret": "test-secret" }),
      })
    );
  });
});
