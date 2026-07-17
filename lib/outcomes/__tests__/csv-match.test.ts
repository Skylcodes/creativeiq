import { describe, it, expect } from "vitest";
import {
  buildPreviewCounts,
  classifyImportRows,
  type MatchContext,
} from "@/lib/outcomes/csv/match";
import { buildImportPreview } from "@/lib/outcomes/csv/import";
import type { NormalizedImportRow } from "@/lib/types/outcome";

const emptyMetrics = {
  spend: null,
  impressions: null,
  clicks: null,
  purchases: null,
  leads: null,
  revenue: null,
};

function row(partial: Partial<NormalizedImportRow> & { rowIndex: number }): NormalizedImportRow {
  return {
    launchId: null,
    analysisId: null,
    variantId: null,
    platform: null,
    externalAdId: null,
    externalCampaignId: null,
    launchedAt: null,
    windowType: "7d",
    windowStart: null,
    windowEnd: null,
    currency: "USD",
    metrics: { ...emptyMetrics, spend: 100 },
    notes: null,
    unknownColumns: [],
    ...partial,
  };
}

function emptyCtx(overrides: Partial<MatchContext> = {}): MatchContext {
  return {
    launchesById: new Map(),
    launchesByExternal: new Map(),
    analysesById: new Map(),
    ...overrides,
  };
}

describe("classifyImportRows", () => {
  it("marks rows with invalid metrics as invalid", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          launchId: "launch-1",
          metrics: { ...emptyMetrics, spend: -5 },
        }),
      ],
      emptyCtx({
        launchesById: new Map([
          [
            "launch-1",
            {
              id: "launch-1",
              analysis_id: "an-1",
              platform: "meta",
              external_ad_id: null,
              variant_id: null,
            },
          ],
        ]),
      })
    );

    expect(result[0].status).toBe("invalid");
    expect(result[0].reason).toMatch(/spend/i);
    expect(result[0].matchedLaunchId).toBeNull();
  });

  it("marks rows with unresolvable window as invalid", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          launchId: "launch-1",
          windowType: "custom",
          windowStart: null,
          windowEnd: null,
        }),
      ],
      emptyCtx({
        launchesById: new Map([
          [
            "launch-1",
            {
              id: "launch-1",
              analysis_id: "an-1",
              platform: "meta",
              external_ad_id: null,
              variant_id: null,
            },
          ],
        ]),
      })
    );

    expect(result[0].status).toBe("invalid");
    expect(result[0].reason).toBeTruthy();
  });

  it("matches by launch_id", () => {
    const result = classifyImportRows(
      [row({ rowIndex: 1, launchId: "launch-1", launchedAt: "2026-07-01" })],
      emptyCtx({
        launchesById: new Map([
          [
            "launch-1",
            {
              id: "launch-1",
              analysis_id: "an-1",
              platform: "meta",
              external_ad_id: "ad-9",
              variant_id: null,
            },
          ],
        ]),
      })
    );

    expect(result[0].status).toBe("matched");
    expect(result[0].matchedLaunchId).toBe("launch-1");
    expect(result[0].reason).toBeNull();
  });

  it("matches by platform + external_ad_id", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          platform: "meta",
          externalAdId: "1202",
          launchedAt: "2026-07-01",
        }),
      ],
      emptyCtx({
        launchesById: new Map([
          [
            "launch-ext",
            {
              id: "launch-ext",
              analysis_id: "an-1",
              platform: "meta",
              external_ad_id: "1202",
              variant_id: null,
            },
          ],
        ]),
        launchesByExternal: new Map([["meta:1202", "launch-ext"]]),
      })
    );

    expect(result[0].status).toBe("matched");
    expect(result[0].matchedLaunchId).toBe("launch-ext");
  });

  it("classifies create_launch when analysis is completed and fields resolve", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          analysisId: "an-1",
          platform: "meta",
          launchedAt: "2026-07-01",
          windowType: "7d",
        }),
      ],
      emptyCtx({
        analysesById: new Map([
          [
            "an-1",
            {
              id: "an-1",
              status: "completed",
              analysis_mode: "funnel",
              variants: [],
            },
          ],
        ]),
      })
    );

    expect(result[0].status).toBe("create_launch");
    expect(result[0].matchedLaunchId).toBeNull();
  });

  it("leaves Meta rows without launch or analysis_id unmatched with guidance", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          platform: "meta",
          externalAdId: "999",
          launchedAt: "2026-07-01",
        }),
      ],
      emptyCtx()
    );

    expect(result[0].status).toBe("unmatched");
    expect(result[0].reason).toBe(
      "Log launch first or use Advara template with analysis_id"
    );
  });

  it("requires variant_id for comparison analyses before create_launch", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          analysisId: "an-cmp",
          platform: "meta",
          launchedAt: "2026-07-01",
        }),
      ],
      emptyCtx({
        analysesById: new Map([
          [
            "an-cmp",
            {
              id: "an-cmp",
              status: "completed",
              analysis_mode: "comparison",
              variants: [{ id: "v1" }, { id: "v2" }],
            },
          ],
        ]),
      })
    );

    expect(result[0].status).toBe("unmatched");
    expect(result[0].reason).toMatch(/variant/i);
  });

  it("create_launch succeeds for comparison when variant_id is valid", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          analysisId: "an-cmp",
          variantId: "v2",
          platform: "tiktok",
          launchedAt: "2026-07-01",
        }),
      ],
      emptyCtx({
        analysesById: new Map([
          [
            "an-cmp",
            {
              id: "an-cmp",
              status: "completed",
              analysis_mode: "comparison",
              variants: [{ id: "v1" }, { id: "v2" }],
            },
          ],
        ]),
      })
    );

    expect(result[0].status).toBe("create_launch");
  });

  it("flags earlier in-file duplicates and keeps the last row active", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          launchId: "launch-1",
          windowType: "7d",
          metrics: { ...emptyMetrics, spend: 10 },
        }),
        row({
          rowIndex: 2,
          launchId: "launch-1",
          windowType: "7d",
          metrics: { ...emptyMetrics, spend: 99 },
        }),
      ],
      emptyCtx({
        launchesById: new Map([
          [
            "launch-1",
            {
              id: "launch-1",
              analysis_id: "an-1",
              platform: "meta",
              external_ad_id: null,
              variant_id: null,
            },
          ],
        ]),
      })
    );

    expect(result[0].status).toBe("duplicate");
    expect(result[1].status).toBe("matched");
    expect(result[1].normalized.metrics.spend).toBe(99);
  });

  it("prefers launch_id match over create_launch", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          launchId: "launch-1",
          analysisId: "an-1",
          platform: "meta",
          launchedAt: "2026-07-01",
        }),
      ],
      emptyCtx({
        launchesById: new Map([
          [
            "launch-1",
            {
              id: "launch-1",
              analysis_id: "an-1",
              platform: "meta",
              external_ad_id: null,
              variant_id: null,
            },
          ],
        ]),
        analysesById: new Map([
          [
            "an-1",
            {
              id: "an-1",
              status: "completed",
              analysis_mode: "funnel",
              variants: [],
            },
          ],
        ]),
      })
    );

    expect(result[0].status).toBe("matched");
    expect(result[0].matchedLaunchId).toBe("launch-1");
  });
});

describe("buildPreviewCounts", () => {
  it("counts importable as matched + create_launch only", () => {
    // Keys: rows 1,5,6 share launch:launch-1|7d → last (6) matched, 1+5 duplicate.
    // Row 2 create_launch, row 3 unmatched, row 4 invalid.
    const classified = classifyImportRows(
      [
        row({ rowIndex: 1, launchId: "launch-1", windowType: "7d" }),
        row({
          rowIndex: 2,
          analysisId: "an-1",
          platform: "meta",
          launchedAt: "2026-07-01",
        }),
        row({ rowIndex: 3, platform: "meta", externalAdId: "nope" }),
        row({
          rowIndex: 4,
          launchId: "launch-other",
          metrics: { ...emptyMetrics, spend: -1 },
        }),
        row({ rowIndex: 5, launchId: "launch-1", windowType: "7d" }),
        row({ rowIndex: 6, launchId: "launch-1", windowType: "7d" }),
      ],
      emptyCtx({
        launchesById: new Map([
          [
            "launch-1",
            {
              id: "launch-1",
              analysis_id: "an-1",
              platform: "meta",
              external_ad_id: null,
              variant_id: null,
            },
          ],
          [
            "launch-other",
            {
              id: "launch-other",
              analysis_id: "an-1",
              platform: "meta",
              external_ad_id: null,
              variant_id: null,
            },
          ],
        ]),
        analysesById: new Map([
          [
            "an-1",
            {
              id: "an-1",
              status: "completed",
              analysis_mode: "funnel",
              variants: [],
            },
          ],
        ]),
      })
    );

    const counts = buildPreviewCounts(classified);
    expect(counts).toEqual({
      matched: 1,
      createLaunch: 1,
      unmatched: 1,
      invalid: 1,
      duplicate: 2,
      importable: 2,
    });
  });
});

describe("buildImportPreview", () => {
  it("assembles ImportPreviewResult with classified rows and counts", () => {
    const preview = buildImportPreview({
      format: "advara",
      contentHash: "abc",
      filename: "results.csv",
      unknownColumns: ["foo"],
      rows: [
        row({ rowIndex: 1, launchId: "launch-1" }),
        row({ rowIndex: 2, platform: "meta", externalAdId: "x" }),
      ],
      ctx: emptyCtx({
        launchesById: new Map([
          [
            "launch-1",
            {
              id: "launch-1",
              analysis_id: "an-1",
              platform: "meta",
              external_ad_id: null,
              variant_id: null,
            },
          ],
        ]),
      }),
    });

    expect(preview.format).toBe("advara");
    expect(preview.contentHash).toBe("abc");
    expect(preview.filename).toBe("results.csv");
    expect(preview.unknownColumns).toEqual(["foo"]);
    expect(preview.rows).toHaveLength(2);
    expect(preview.counts.matched).toBe(1);
    expect(preview.counts.unmatched).toBe(1);
    expect(preview.counts.importable).toBe(1);
  });
});
