import { describe, expect, it, vi } from "vitest";
import { isTransientError, withTransientRetry } from "@/lib/ai/pipeline/transient";

describe("isTransientError", () => {
  it("treats 429, 5xx, and timeouts as transient", () => {
    expect(isTransientError({ status: 429, message: "rate limited" })).toBe(true);
    expect(isTransientError({ status: 503, message: "unavailable" })).toBe(true);
    expect(isTransientError(Object.assign(new Error("timed out"), { name: "TimeoutError" }))).toBe(
      true
    );
    expect(isTransientError(new Error("Claude returned an empty response."))).toBe(false);
    expect(isTransientError({ status: 400, message: "bad request" })).toBe(false);
  });
});

describe("withTransientRetry", () => {
  it("retries once on a transient error and then succeeds", async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(Object.assign(new Error("rate limited"), { status: 429 }))
      .mockResolvedValueOnce("ok");

    await expect(withTransientRetry(fn, { delayMs: 1 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-transient errors", async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(new Error("bad json"));
    await expect(withTransientRetry(fn, { delayMs: 1 })).rejects.toThrow("bad json");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
