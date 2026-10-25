import { describe, expect, it } from "vitest";
import { landingCategoryWhy } from "@/lib/report/enrich-report";
import { getCreativeGoalScoreContext } from "@/lib/analyses/creative-goals";

const JARGON = /calibrat|conversion-first|\(\d+\/\d+\)|rubric|contract/i;

describe("user-facing report copy has no internal scoring jargon", () => {
  it("landing-page action reasons never show raw points", () => {
    for (const pct of [0, 0.3, 0.6]) {
      const why = landingCategoryWhy("Message Match", pct);
      expect(why).not.toMatch(JARGON);
      expect(why).toMatch(/message match/);
    }
  });
  it("goal score context is plain language", () => {
    for (const g of ["drive_purchases", "generate_leads", "build_brand_awareness", "promote_sale", "launch_product", "retarget_warm"] as const) {
      expect(getCreativeGoalScoreContext(g)).not.toMatch(JARGON);
    }
  });
});
