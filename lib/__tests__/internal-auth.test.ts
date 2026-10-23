import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAppOrigin,
  getInternalSecretHeader,
  getInternalWorkerHeaders,
  getInternalWorkerOrigin,
  isValidInternalSecret,
} from "@/lib/internal-auth";

const request = (url = "https://preview-host.vercel.app/api/analyses/a1/run") =>
  new Request(url);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAppOrigin (user-facing: Stripe, emails)", () => {
  it("still prefers NEXT_PUBLIC_APP_URL even on preview", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "creativeiq-preview.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://creativeiq-ten.vercel.app");

    expect(getAppOrigin(request())).toBe("https://creativeiq-ten.vercel.app");
  });
});

describe("getInternalWorkerOrigin", () => {
  it("uses https://VERCEL_URL on preview even when NEXT_PUBLIC_APP_URL is production", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "creativeiq-git-preview.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://creativeiq-ten.vercel.app");

    expect(getInternalWorkerOrigin(request())).toBe(
      "https://creativeiq-git-preview.vercel.app"
    );
  });

  it("uses https://VERCEL_URL on development deployments", () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("VERCEL_URL", "creativeiq-abc.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://creativeiq-ten.vercel.app");

    expect(getInternalWorkerOrigin(request())).toBe("https://creativeiq-abc.vercel.app");
  });

  it("falls back to the request origin when VERCEL_URL is missing off production", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://creativeiq-ten.vercel.app");

    expect(
      getInternalWorkerOrigin(request("https://this-preview.vercel.app/api/analyses/a1/run"))
    ).toBe("https://this-preview.vercel.app");
  });

  it("keeps existing production behavior (NEXT_PUBLIC_APP_URL first)", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "creativeiq-some-hash.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://creativeiq-ten.vercel.app");

    expect(getInternalWorkerOrigin(request())).toBe("https://creativeiq-ten.vercel.app");
  });
});

describe("getInternalWorkerHeaders", () => {
  it("includes the internal secret so preview workers still authorize", () => {
    vi.stubEnv("INTERNAL_API_SECRET", "internal-secret");
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "");

    expect(getInternalSecretHeader()).toEqual({ "x-internal-secret": "internal-secret" });
    expect(getInternalWorkerHeaders()).toEqual({ "x-internal-secret": "internal-secret" });
    expect(
      isValidInternalSecret(
        new Request("https://example.com", {
          headers: { "x-internal-secret": "internal-secret" },
        })
      )
    ).toBe(true);
  });

  it("adds x-vercel-protection-bypass when VERCEL_AUTOMATION_BYPASS_SECRET is set", () => {
    vi.stubEnv("INTERNAL_API_SECRET", "internal-secret");
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "bypass-secret");

    expect(getInternalWorkerHeaders()).toEqual({
      "x-internal-secret": "internal-secret",
      "x-vercel-protection-bypass": "bypass-secret",
    });
  });
});
