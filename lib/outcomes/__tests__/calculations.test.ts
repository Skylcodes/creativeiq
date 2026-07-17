import { describe, it, expect } from "vitest";
import {
  computeDerivedMetrics,
  goalKindForCreativeGoal,
} from "@/lib/outcomes/calculations";

describe("computeDerivedMetrics", () => {
  it("computes all metrics from complete purchase data", () => {
    const derived = computeDerivedMetrics(
      {
        spend: 500,
        impressions: 100_000,
        clicks: 2_000,
        purchases: 40,
        leads: null,
        revenue: 1_200,
      },
      "purchases"
    );
    expect(derived.ctr).toBeCloseTo(0.02);
    expect(derived.cpc).toBeCloseTo(0.25);
    expect(derived.cpa).toBeCloseTo(12.5);
    expect(derived.roas).toBeCloseTo(2.4);
    expect(derived.conversionRate).toBeCloseTo(0.02);
  });

  it("uses leads for CPA and conversion rate when goal kind is leads", () => {
    const derived = computeDerivedMetrics(
      {
        spend: 300,
        impressions: 50_000,
        clicks: 1_000,
        purchases: null,
        leads: 60,
        revenue: null,
      },
      "leads"
    );
    expect(derived.cpa).toBeCloseTo(5);
    expect(derived.conversionRate).toBeCloseTo(0.06);
    expect(derived.roas).toBeNull();
  });

  it("returns null instead of dividing by zero or null", () => {
    const derived = computeDerivedMetrics(
      {
        spend: null,
        impressions: 0,
        clicks: 0,
        purchases: 0,
        leads: null,
        revenue: 100,
      },
      "purchases"
    );
    expect(derived.ctr).toBeNull();
    expect(derived.cpc).toBeNull();
    expect(derived.cpa).toBeNull();
    expect(derived.roas).toBeNull();
    expect(derived.conversionRate).toBeNull();
  });
});

describe("goalKindForCreativeGoal", () => {
  it("maps generate_leads to leads", () => {
    expect(goalKindForCreativeGoal("generate_leads")).toBe("leads");
  });

  it("maps everything else (and undefined) to purchases", () => {
    expect(goalKindForCreativeGoal("drive_purchases")).toBe("purchases");
    expect(goalKindForCreativeGoal(undefined)).toBe("purchases");
  });
});
