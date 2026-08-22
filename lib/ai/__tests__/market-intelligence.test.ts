import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/ai/intelligence", () => ({
  buildIntelligenceBrief: vi.fn(),
  formatIntelligenceForPrompt: vi.fn(() => "=== REAL WORLD INTELLIGENCE BRIEF ===\nformatted"),
}));

import { buildIntelligenceBrief } from "@/lib/ai/intelligence";
import { buildMarketIntelligence } from "@/lib/ai/market-intelligence";
import type { IntelligenceBrief } from "@/lib/types/report";

const fakeSupabase = {} as SupabaseClient;

describe("buildMarketIntelligence (Job 2)", () => {
  it("returns a formatted brief when research succeeds", async () => {
    const brief = { category: "skincare", platforms: ["Meta Feed"] } as unknown as IntelligenceBrief;
    vi.mocked(buildIntelligenceBrief).mockResolvedValueOnce(brief);

    const result = await buildMarketIntelligence(fakeSupabase, "ws1", "skincare", ["Meta Feed"]);

    expect(result.degraded).toBe(false);
    expect(result.brief).toBe(brief);
    expect(result.briefText).toContain("REAL WORLD INTELLIGENCE BRIEF");
  });

  it("degrades gracefully (no fabricated context) when no brief is available", async () => {
    vi.mocked(buildIntelligenceBrief).mockResolvedValueOnce(null);

    const result = await buildMarketIntelligence(fakeSupabase, "ws1", "skincare", ["Meta Feed"]);

    expect(result.degraded).toBe(true);
    expect(result.brief).toBeNull();
    expect(result.briefText).toBeUndefined();
  });

  it("degrades gracefully when the underlying research call throws (Tavily/Meta Ad Library failure)", async () => {
    vi.mocked(buildIntelligenceBrief).mockRejectedValueOnce(new Error("Tavily timeout"));

    const result = await buildMarketIntelligence(fakeSupabase, "ws1", "skincare", ["Meta Feed"]);

    expect(result.degraded).toBe(true);
    expect(result.brief).toBeNull();
  });
});
