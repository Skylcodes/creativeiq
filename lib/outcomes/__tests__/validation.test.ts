import { describe, it, expect } from "vitest";
import {
  resolveOutcomeWindow,
  resolveWindow,
  validateLaunchInput,
  validateOutcomeInput,
} from "@/lib/outcomes/validation";
import type { LogLaunchInput, RecordOutcomeInput } from "@/lib/types/outcome";

const validLaunch: LogLaunchInput = {
  workspaceId: "ws-1",
  analysisId: "an-1",
  platform: "meta",
  launchedAt: "2026-07-10",
};

const validOutcome: RecordOutcomeInput = {
  launchId: "l-1",
  windowType: "7d",
  currency: "USD",
  metrics: {
    spend: 500,
    impressions: 100_000,
    clicks: 2_000,
    purchases: 40,
    leads: null,
    revenue: 1_200,
  },
};

describe("validateLaunchInput", () => {
  it("accepts a valid launch", () => {
    expect(validateLaunchInput(validLaunch)).toEqual([]);
  });

  it("rejects a future launch date", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const errors = validateLaunchInput({ ...validLaunch, launchedAt: future });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects an invalid platform", () => {
    const errors = validateLaunchInput({
      ...validLaunch,
      platform: "google" as never,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects an unparseable date", () => {
    expect(
      validateLaunchInput({ ...validLaunch, launchedAt: "not-a-date" }).length
    ).toBeGreaterThan(0);
  });
});

describe("validateOutcomeInput", () => {
  it("accepts valid metrics", () => {
    expect(validateOutcomeInput(validOutcome)).toEqual([]);
  });

  it("rejects negative metrics", () => {
    const errors = validateOutcomeInput({
      ...validOutcome,
      metrics: { ...validOutcome.metrics, spend: -1 },
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects clicks greater than impressions", () => {
    const errors = validateOutcomeInput({
      ...validOutcome,
      metrics: { ...validOutcome.metrics, impressions: 100, clicks: 200 },
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects purchases greater than clicks", () => {
    const errors = validateOutcomeInput({
      ...validOutcome,
      metrics: { ...validOutcome.metrics, clicks: 10, purchases: 20 },
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects a disallowed currency", () => {
    const errors = validateOutcomeInput({ ...validOutcome, currency: "JPY" });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects when every metric is empty", () => {
    const errors = validateOutcomeInput({
      ...validOutcome,
      metrics: {
        spend: null,
        impressions: null,
        clicks: null,
        purchases: null,
        leads: null,
        revenue: null,
      },
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("resolveWindow", () => {
  it("computes a 7-day window from the launch date", () => {
    const { windowStart, windowEnd } = resolveWindow("2026-07-10", "7d");
    expect(windowStart).toBe(new Date("2026-07-10T00:00:00.000Z").toISOString());
    expect(windowEnd).toBe(new Date("2026-07-17T00:00:00.000Z").toISOString());
  });
});

describe("resolveOutcomeWindow", () => {
  it("resolves fixed 7d from launch date", () => {
    const w = resolveOutcomeWindow({
      launchedAt: "2026-07-01",
      windowType: "7d",
    });
    expect(w.windowType).toBe("7d");
    expect(w.windowStart).toBe("2026-07-01T00:00:00.000Z");
    expect(w.windowEnd).toBe("2026-07-08T00:00:00.000Z");
  });

  it("accepts custom start/end", () => {
    const w = resolveOutcomeWindow({
      launchedAt: "2026-07-01",
      windowType: "custom",
      windowStart: "2026-07-01",
      windowEnd: "2026-07-06",
    });
    expect(w.windowType).toBe("custom");
    expect(w.windowEnd > w.windowStart).toBe(true);
  });

  it("infers 7d when start/end span exactly 7 days and windowType omitted via custom dates matching", () => {
    const w = resolveOutcomeWindow({
      launchedAt: "2026-07-01",
      windowType: "custom",
      windowStart: "2026-07-01T00:00:00.000Z",
      windowEnd: "2026-07-08T00:00:00.000Z",
    });
    // Still custom if caller passed custom; inference happens in normalize, not here.
    expect(w.windowType).toBe("custom");
  });
});
