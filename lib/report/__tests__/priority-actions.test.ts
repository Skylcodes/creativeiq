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
