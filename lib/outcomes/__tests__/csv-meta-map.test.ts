import { describe, it, expect } from "vitest";
import { normalizeMetaRows } from "@/lib/outcomes/csv/meta-map";

describe("normalizeMetaRows", () => {
  it("maps Meta Ads Manager aliases to normalized fields", () => {
    const headers = [
      "Ad ID",
      "Amount spent (USD)",
      "Impressions",
      "Link clicks",
      "Website purchases",
      "On-Facebook leads",
      "Website purchases conversion value",
      "Reporting starts",
      "Reporting ends",
      "Campaign name",
    ];
    const { rows, unknownColumns } = normalizeMetaRows(headers, [
      [
        "120212345678901234",
        "1,234.50",
        "10000",
        "250",
        "12",
        "3",
        "4500.25",
        "2026-07-01",
        "2026-07-08",
        "Summer",
      ],
    ]);

    expect(unknownColumns).toEqual(["Campaign name"]);
    expect(rows).toHaveLength(1);

    const row = rows[0];
    expect(row.rowIndex).toBe(1);
    expect(row.platform).toBe("meta");
    expect(row.externalAdId).toBe("120212345678901234");
    expect(row.launchId).toBeNull();
    expect(row.analysisId).toBeNull();
    expect(row.variantId).toBeNull();
    expect(row.externalCampaignId).toBeNull();
    expect(row.notes).toBeNull();
    expect(row.currency).toBe("USD");
    expect(row.launchedAt).toBe("2026-07-01");
    expect(row.windowStart).toBe("2026-07-01");
    expect(row.windowEnd).toBe("2026-07-08");
    expect(row.windowType).toBe("7d");
    expect(row.metrics).toEqual({
      spend: 1234.5,
      impressions: 10000,
      clicks: 250,
      purchases: 12,
      leads: 3,
      revenue: 4500.25,
    });
    expect(row.unknownColumns).toEqual(["Campaign name"]);
  });

  it("accepts alternate Meta aliases (Amount spent, Clicks (all), Purchase conversion value)", () => {
    const headers = [
      "ad id",
      "Amount spent",
      "Clicks (all)",
      "Purchases",
      "Leads",
      "Purchase conversion value",
      "spend",
    ];
    const { rows } = normalizeMetaRows(headers, [
      ["ad-9", "10", "5", "1", "2", "99", "should-ignore-dup"],
    ]);

    expect(rows[0].externalAdId).toBe("ad-9");
    expect(rows[0].metrics.spend).toBe(10);
    expect(rows[0].metrics.clicks).toBe(5);
    expect(rows[0].metrics.purchases).toBe(1);
    expect(rows[0].metrics.leads).toBe(2);
    expect(rows[0].metrics.revenue).toBe(99);
    expect(rows[0].platform).toBe("meta");
  });

  it("never maps ROAS columns to revenue", () => {
    const headers = [
      "Ad ID",
      "Purchase ROAS (return on ad spend)",
      "Website purchase ROAS",
      "Website purchases conversion value",
    ];
    const { rows, unknownColumns } = normalizeMetaRows(headers, [
      ["ad-1", "2.5", "3.1", "100"],
    ]);

    expect(rows[0].metrics.revenue).toBe(100);
    expect(unknownColumns).toEqual(
      expect.arrayContaining([
        "Purchase ROAS (return on ad spend)",
        "Website purchase ROAS",
      ])
    );
  });

  it("still emits a row when Ad ID is missing", () => {
    const headers = ["Amount spent", "Impressions"];
    const { rows } = normalizeMetaRows(headers, [["25", "500"]]);

    expect(rows).toHaveLength(1);
    expect(rows[0].externalAdId).toBeNull();
    expect(rows[0].platform).toBe("meta");
    expect(rows[0].metrics.spend).toBe(25);
    expect(rows[0].metrics.impressions).toBe(500);
  });

  it("rejects non-numeric metric cells as null", () => {
    const { rows } = normalizeMetaRows(["Ad ID", "Amount spent"], [
      ["ad-1", "not-a-number"],
    ]);
    expect(rows[0].metrics.spend).toBeNull();
  });
});
