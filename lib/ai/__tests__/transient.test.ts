import { describe, expect, it, vi } from "vitest";
import {
  isTransientError,
  isTransientStatus,
  withTransientRetry,
  withTransientRetryResult,
} from "@/lib/ai/pipeline/transient";

describe("transient retry helpers", () => {
  it("treats 429 and 5xx as transient statuses", () => {
    expect(isTransientStatus(429)).toBe(true);
    expect(isTransientStatus(503)).toBe(true);
    expect(isTransientStatus(404)).toBe(false);
    expect(isTransientStatus(200)).toBe(false);
  });

  it("treats timeouts and 429/5xx messages as transient errors", () => {
    expect(isTransientError(new Error("timed out"))).toBe(true);
    expect(isTransientError(Object.assign(new Error("aborted"), { name: "AbortError" }))).toBe(
      true
    );
    expect(isTransientError(new Error("HTTP 429 rate limited"))).toBe(true);
    expect(isTransientError(new Error("validation failed"))).toBe(false);
  });

  it("retries a thrown transient error once", async () => {
    const fn = vi
      .fn<( ) => Promise<string>>()
      .mockRejectedValueOnce(new Error("ETIMEDOUT"))
      .mockResolvedValueOnce("ok");

    await expect(withTransientRetry(fn, { delayMs: 0 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-transient error", async () => {
    const fn = vi.fn<() => Promise<string>>().mockRejectedValue(new Error("bad request"));
    await expect(withTransientRetry(fn, { delayMs: 0 })).rejects.toThrow("bad request");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("retries a 503 result once", async () => {
    const fn = vi
      .fn<() => Promise<{ status: number }>>()
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 200 });

    await expect(
      withTransientRetryResult(fn, (r) => isTransientStatus(r.status), 0)
    ).resolves.toEqual({ status: 200 });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
