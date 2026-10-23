import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("login redirect", () => {
  it("sends /login to /sign-in", async () => {
    const redirects =
      typeof nextConfig.redirects === "function" ? await nextConfig.redirects() : [];
    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "/login",
          destination: "/sign-in",
        }),
      ])
    );
  });
});
