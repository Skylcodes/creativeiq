import { describe, it, expect } from "vitest";
import {
  buildPreviewCounts,
  classifyImportRows,
  type MatchContext,
  type MatchLaunch,
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

function launch(partial: Partial<MatchLaunch> & { id: string }): MatchLaunch {
  return {
    analysis_id: "an-1",
    platform: "meta",
    external_ad_id: null,
    variant_id: null,
    launched_at: "2026-07-01",
    ...partial,
  };
}

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
    launchesByAnalysisVariant: new Map(),
    ambiguousAnalysisVariants: new Set(),
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
        launchesById: new Map([["launch-1", launch({ id: "launch-1" })]]),
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
        launchesById: new Map([["launch-1", launch({ id: "launch-1" })]]),
      })
    );

    expect(result[0].status).toBe("invalid");
    expect(result[0].reason).toBeTruthy();
  });

  it("matches by launch_id using launch.launched_at when row omits launchedAt", () => {
    const result = classifyImportRows(
      [row({ rowIndex: 1, launchId: "launch-1" })],
      emptyCtx({
        launchesById: new Map([
          ["launch-1", launch({ id: "launch-1", launched_at: "2026-06-15" })],
        ]),
      })
    );

    expect(result[0].status).toBe("matched");
    expect(result[0].matchedLaunchId).toBe("launch-1");
    expect(result[0].reason).toBeNull();
  });

  it("marks unknown launch_id as unmatched without falling through", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          launchId: "missing-launch",
          analysisId: "analysis-1",
          platform: "meta",
          externalAdId: "1202",
          launchedAt: "2026-07-01",
        }),
      ],
      emptyCtx({
        launchesById: new Map([
          [
            "launch-ext",
            launch({
              id: "launch-ext",
              analysis_id: "analysis-1",
              external_ad_id: "1202",
            }),
          ],
        ]),
        launchesByExternal: new Map([["meta:1202", "launch-ext"]]),
        launchesByAnalysisVariant: new Map([["analysis-1:", "launch-ext"]]),
        analysesById: new Map([
          [
            "analysis-1",
            {
              id: "analysis-1",
              status: "completed",
              analysis_mode: "single",
              variants: [],
            },
          ],
        ]),
      })
    );

    expect(result[0].status).toBe("unmatched");
    expect(result[0].reason).toBe("Launch ID not found in this workspace.");
    expect(result[0].matchedLaunchId).toBeNull();
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
            launch({
              id: "launch-ext",
              external_ad_id: "1202",
            }),
          ],
        ]),
        launchesByExternal: new Map([["meta:1202", "launch-ext"]]),
      })
    );

    expect(result[0].status).toBe("matched");
    expect(result[0].matchedLaunchId).toBe("launch-ext");
  });

  it("matches existing launch by analysis_id + variant_id", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          analysisId: "an-1",
          platform: "meta",
        }),
      ],
      emptyCtx({
        launchesById: new Map([
          ["launch-av", launch({ id: "launch-av", analysis_id: "an-1" })],
        ]),
        launchesByAnalysisVariant: new Map([["an-1:", "launch-av"]]),
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
    expect(result[0].matchedLaunchId).toBe("launch-av");
  });

  it("prefers analysis+variant match over external_ad_id when both present", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          analysisId: "an-1",
          platform: "meta",
          externalAdId: "1202",
        }),
      ],
      emptyCtx({
        launchesById: new Map([
          [
            "launch-av",
            launch({ id: "launch-av", analysis_id: "an-1", external_ad_id: null }),
          ],
          [
            "launch-ext",
            launch({
              id: "launch-ext",
              analysis_id: "an-other",
              external_ad_id: "1202",
            }),
          ],
        ]),
        launchesByAnalysisVariant: new Map([["an-1:", "launch-av"]]),
        launchesByExternal: new Map([["meta:1202", "launch-ext"]]),
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
    expect(result[0].matchedLaunchId).toBe("launch-av");
  });

  it("leaves funnel rows with variant_id unmatched", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          analysisId: "an-1",
          variantId: "v1",
          platform: "meta",
          launchedAt: "2026-07-01",
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

    expect(result[0].status).toBe("unmatched");
    expect(result[0].reason).toMatch(/no variants/i);
  });

  it("leaves comparison rows with unknown variant unmatched", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          analysisId: "an-cmp",
          variantId: "missing",
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
    expect(result[0].reason).toMatch(/variant not found/i);
  });

  it("does not create_launch for non-completed analysis", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          analysisId: "an-1",
          platform: "meta",
          launchedAt: "2026-07-01",
        }),
      ],
      emptyCtx({
        analysesById: new Map([
          [
            "an-1",
            {
              id: "an-1",
              status: "processing",
              analysis_mode: "funnel",
              variants: [],
            },
          ],
        ]),
      })
    );

    expect(result[0].status).toBe("unmatched");
    expect(result[0].reason).toBe(
      "Log launch first or use Advara template with analysis_id"
    );
  });

  it("leaves ambiguous analysis/variant matches unmatched", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          analysisId: "an-1",
          platform: "meta",
          launchedAt: "2026-07-01",
        }),
      ],
      emptyCtx({
        ambiguousAnalysisVariants: new Set(["an-1:"]),
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

    expect(result[0].status).toBe("unmatched");
    expect(result[0].reason).toBe(
      "Multiple launches for this analysis/variant; use launch_id"
    );
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

  it("flags earlier in-file duplicates by resolved launch id and keeps the last row active", () => {
    const result = classifyImportRows(
      [
        row({
          rowIndex: 1,
          analysisId: "an-1",
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
        launchesById: new Map([["launch-1", launch({ id: "launch-1" })]]),
        launchesByAnalysisVariant: new Map([["an-1:", "launch-1"]]),
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

    // Both resolve to launch-1|7d; last wins
    expect(result[0].status).toBe("duplicate");
    expect(result[1].status).toBe("matched");
    expect(result[1].matchedLaunchId).toBe("launch-1");
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
        launchesById: new Map([["launch-1", launch({ id: "launch-1" })]]),
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
          ["launch-1", launch({ id: "launch-1" })],
          ["launch-other", launch({ id: "launch-other" })],
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
        launchesById: new Map([["launch-1", launch({ id: "launch-1" })]]),
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
