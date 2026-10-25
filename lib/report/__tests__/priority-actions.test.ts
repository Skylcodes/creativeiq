import { describe, expect, it } from "vitest";
import { actionsAreDuplicates, MAX_PRIORITY_ACTIONS } from "@/lib/report/enrich-report";

const pa = (action: string, currentProblem = "") => ({
  action,
  impact: "high" as const,
  effort: "low" as const,
  currentProblem,
  whyItMatters: "",
  strategicFix: action,
  expectedImpact: "",
});

describe("priority action dedupe (0006 stronger)", () => {
  it("merges synonym rewrites", () => {
    expect(actionsAreDuplicates(
      pa("Add a caption in the opening that names the product"),
      pa("Put on-screen text in the first 2 seconds naming the product")
    )).toBe(true);
    expect(actionsAreDuplicates(
      pa("Shorten the video to under 25 seconds"),
      pa("Trim the ad to ~20s by cutting the middle")
    )).toBe(true);
  });
  it("merges two fixes for the same timestamped moment", () => {
    expect(actionsAreDuplicates(
      pa("Replace the report scroll at 0:36", "dense report at 0:36"),
      pa("Show one highlighted insight instead of scrolling the report", "slow scroll at 0:36")
    )).toBe(true);
  });
  it("still keeps unrelated actions apart", () => {
    expect(actionsAreDuplicates(
      pa("Add a single CTA: Start free trial"),
      pa("Add a customer review count above the fold")
    )).toBe(false);
  });
});

describe("priority action dedupe", () => {
  it("caps at 5", () => expect(MAX_PRIORITY_ACTIONS).toBe(5));
  it("flags near-duplicate wording", () => {
    expect(
      actionsAreDuplicates(
        pa("Cut the report scroll at 0:36 and show one key insight"),
        pa("Cut the slow report scroll at ~0:36; show a single key insight instead")
      )
    ).toBe(true);
    expect(
      actionsAreDuplicates(
        pa("Add a sound-off caption explaining what SalesPulse does in the first 2s"),
        pa("Add on-screen caption in the first 2 seconds explaining what SalesPulse does")
      )
    ).toBe(true);
  });
  it("keeps genuinely different actions", () => {
    expect(
      actionsAreDuplicates(
        pa("Cut the report scroll at 0:36"),
        pa("Add social proof (review count) above the fold on the landing page")
      )
    ).toBe(false);
  });
});
