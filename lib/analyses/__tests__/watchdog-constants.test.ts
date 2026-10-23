import { describe, expect, it } from "vitest";
import {
  ANALYSIS_TIMEOUT_MESSAGE,
  ANALYSIS_TIMEOUT_MS,
  isTimeoutError,
} from "@/lib/analyses/watchdog-constants";

describe("watchdog constants", () => {
  it("fails stuck rows after 6 minutes, not 10", () => {
    expect(ANALYSIS_TIMEOUT_MS).toBe(6 * 60 * 1000);
  });

  it("uses a stable timeout message for the UI", () => {
    expect(isTimeoutError(ANALYSIS_TIMEOUT_MESSAGE)).toBe(true);
    expect(isTimeoutError("something else")).toBe(false);
  });
});
