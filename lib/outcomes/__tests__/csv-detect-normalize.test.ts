import { describe, it, expect } from "vitest";
import { ADVARA_CSV_HEADERS, buildAdvaraTemplateCsv } from "@/lib/outcomes/csv/template";
import { detectCsvFormat } from "@/lib/outcomes/csv/detect";
import { inferWindowType } from "@/lib/outcomes/csv/windows";
import { normalizeAdvaraRows } from "@/lib/outcomes/csv/normalize";

describe("detectCsvFormat", () => {
  it("detects Advara when ≥4 fingerprint headers present", () => {
    expect(
      detectCsvFormat(["launch_id", "analysis_id", "spend", "window", "extra"])
    ).toBe("advara");
    expect(
      detectCsvFormat(["Launch_ID", "PLATFORM", "Spend", "Window"])
    ).toBe("advara");
  });

  it("detects Meta when Ad ID plus spend or impressions", () => {
    expect(detectCsvFormat(["Ad ID", "Amount spent", "Campaign"])).toBe("meta");
    expect(detectCsvFormat(["ad id", "Impressions"])).toBe("meta");
  });

  it("returns unknown for unrelated headers", () => {
    expect(detectCsvFormat(["name", "value", "date"])).toBe("unknown");
    expect(detectCsvFormat(["Ad ID", "Campaign name"])).toBe("unknown");
    expect(detectCsvFormat(["spend", "window", "platform"])).toBe("unknown");
  });
});

describe("inferWindowType", () => {
  it("infers 7d for exact 7-day span", () => {
    expect(
      inferWindowType("2026-07-01T00:00:00.000Z", "2026-07-08T00:00:00.000Z")
    ).toBe("7d");
  });

  it("returns custom when span is not 3/7/14 days", () => {
    expect(
      inferWindowType("2026-07-01T00:00:00.000Z", "2026-07-06T00:00:00.000Z")
    ).toBe("custom");
  });
});

describe("template", () => {
  it("exposes canonical headers and builds CSV", () => {
    expect(ADVARA_CSV_HEADERS).toContain("launch_id");
    expect(ADVARA_CSV_HEADERS).toContain("spend");
    const csv = buildAdvaraTemplateCsv();
    expect(csv.startsWith(ADVARA_CSV_HEADERS.join(","))).toBe(true);
  });
});

describe("normalizeAdvaraRows", () => {
  it("parses spend and collects unknown columns", () => {
    const headers = [
      "launch_id",
      "platform",
      "spend",
      "window",
      "currency",
      "mystery_col",
    ];
    const { rows, unknownColumns } = normalizeAdvaraRows(headers, [
      ["launch-1", "meta", "42.5", "7d", "USD", "x"],
      ["", "tiktok", "", "3d", "", "y"],
    ]);

    expect(unknownColumns).toEqual(["mystery_col"]);
    expect(rows).toHaveLength(2);
    expect(rows[0].rowIndex).toBe(1);
    expect(rows[0].launchId).toBe("launch-1");
    expect(rows[0].platform).toBe("meta");
    expect(rows[0].metrics.spend).toBe(42.5);
    expect(rows[0].windowType).toBe("7d");
    expect(rows[0].currency).toBe("USD");
    expect(rows[0].unknownColumns).toEqual(["mystery_col"]);

    expect(rows[1].metrics.spend).toBeNull();
    expect(rows[1].platform).toBe("tiktok");
    expect(rows[1].currency).toBe("USD");
  });

  it("infers windowType from dates when window is empty", () => {
    const headers = ["window", "window_start", "window_end", "spend"];
    const { rows } = normalizeAdvaraRows(headers, [
      ["", "2026-07-01", "2026-07-08", "10"],
    ]);
    expect(rows[0].windowType).toBe("7d");
    expect(rows[0].windowStart).toBe("2026-07-01");
    expect(rows[0].windowEnd).toBe("2026-07-08");
    expect(rows[0].metrics.spend).toBe(10);
  });

  it("rejects invalid platform values as null", () => {
    const { rows } = normalizeAdvaraRows(["platform", "spend"], [["facebook", "1"]]);
    expect(rows[0].platform).toBeNull();
  });
});
