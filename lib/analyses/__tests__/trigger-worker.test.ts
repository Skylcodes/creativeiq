import { beforeEach, describe, expect, it, vi } from "vitest";

const afterCallbacks: Array<() => unknown> = [];
const afterMock = vi.fn((fn: () => unknown) => {
  afterCallbacks.push(fn);
});

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => afterMock(fn),
}));

vi.mock("@/lib/internal-auth", () => ({
  getAppOrigin: () => "https://app.example",
  getInternalSecretHeader: () => ({ "x-internal-secret": "secret" }),
}));

describe("triggerBackgroundWorker", () => {
  beforeEach(() => {
    afterCallbacks.length = 0;
    afterMock.mockClear();
    vi.unstubAllGlobals();
  });

  it("schedules the worker fetch with after() instead of a bare void fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { triggerBackgroundWorker } = await import("@/lib/trigger-worker");
    triggerBackgroundWorker(new Request("https://app.example/api/analyses/a1/run"), "/api/analyses/a1/worker");

    expect(afterMock).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();

    await afterCallbacks[0]();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://app.example/api/analyses/a1/worker");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-internal-secret"]).toBe("secret");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
