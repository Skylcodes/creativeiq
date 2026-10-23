import { beforeEach, describe, expect, it, vi } from "vitest";

const afterCallbacks: Array<() => unknown> = [];
const afterMock = vi.fn((fn: () => unknown) => {
  afterCallbacks.push(fn);
});

vi.mock("next/server", () => ({
  after: (fn: () => unknown) => afterMock(fn),
}));

describe("triggerBackgroundWorker", () => {
  beforeEach(() => {
    afterCallbacks.length = 0;
    afterMock.mockClear();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.stubEnv("INTERNAL_API_SECRET", "secret");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://creativeiq-ten.vercel.app");
  });

  async function triggerAndFlush(requestUrl: string, path: string) {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { triggerBackgroundWorker } = await import("@/lib/trigger-worker");
    triggerBackgroundWorker(new Request(requestUrl), path);

    expect(afterMock).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
    await afterCallbacks[0]();
    return fetchMock;
  }

  it("schedules the worker fetch with after() instead of a bare void fetch", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const fetchMock = await triggerAndFlush(
      "https://creativeiq-ten.vercel.app/api/analyses/a1/run",
      "/api/analyses/a1/worker"
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://creativeiq-ten.vercel.app/api/analyses/a1/worker");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-internal-secret"]).toBe("secret");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("triggers the current preview deployment, not NEXT_PUBLIC_APP_URL production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "creativeiq-git-preview.vercel.app");
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "bypass-secret");

    const fetchMock = await triggerAndFlush(
      "https://creativeiq-git-preview.vercel.app/api/analyses/a1/run",
      "/api/analyses/a1/worker"
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://creativeiq-git-preview.vercel.app/api/analyses/a1/worker");
    expect(url).not.toContain("creativeiq-ten.vercel.app");
    expect((init.headers as Record<string, string>)["x-internal-secret"]).toBe("secret");
    expect((init.headers as Record<string, string>)["x-vercel-protection-bypass"]).toBe(
      "bypass-secret"
    );
  });
});
