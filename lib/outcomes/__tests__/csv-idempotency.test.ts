import { describe, it, expect } from "vitest";
import {
  classifyImportRows,
  type MatchContext,
  type MatchLaunch,
} from "@/lib/outcomes/csv/match";
import { outcomeUpsertKey } from "@/lib/outcomes/upsert-key";
import type { ImportPreviewRow, NormalizedImportRow } from "@/lib/types/outcome";

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

function upsertKeysForImportable(rows: ImportPreviewRow[]): string[] {
  return rows
    .filter((r) => r.status === "matched" && r.matchedLaunchId && r.normalized.windowType)
    .map((r) =>
      outcomeUpsertKey(r.matchedLaunchId!, r.normalized.windowType!)
    );
}

describe("outcomeUpsertKey", () => {
  it("joins launch id and window type for DB upsert identity", () => {
    expect(outcomeUpsertKey("launch-1", "7d")).toBe("launch-1:7d");
    expect(outcomeUpsertKey("launch-1", "custom")).toBe("launch-1:custom");
  });
});

describe("CSV import idempotency (preview layer)", () => {
  const ctx = emptyCtx({
    launchesById: new Map([
      ["launch-1", launch({ id: "launch-1" })],
      ["launch-2", launch({ id: "launch-2", external_ad_id: "1202" })],
    ]),
    launchesByExternal: new Map([["meta:1202", "launch-2"]]),
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
  });

  const normalized = [
    row({ rowIndex: 1, launchId: "launch-1", windowType: "7d" }),
    row({ rowIndex: 2, platform: "meta", externalAdId: "1202", windowType: "14d" }),
    row({
      rowIndex: 3,
      analysisId: "an-1",
      platform: "meta",
      launchedAt: "2026-07-02",
      windowType: "3d",
    }),
  ];

  it("classifying the same normalized rows twice yields identical statuses and upsert keys", () => {
    const first = classifyImportRows(normalized, ctx);
    const second = classifyImportRows(normalized, ctx);

    expect(second.map((r) => r.status)).toEqual(first.map((r) => r.status));
    expect(second.map((r) => r.matchedLaunchId)).toEqual(
      first.map((r) => r.matchedLaunchId)
    );
    expect(second.map((r) => r.normalized.windowType)).toEqual(
      first.map((r) => r.normalized.windowType)
    );
    expect(upsertKeysForImportable(second)).toEqual(upsertKeysForImportable(first));
    expect(upsertKeysForImportable(first)).toEqual([
      "launch-1:7d",
      "launch-2:14d",
      "launch-1:3d",
    ]);
  });

  /**
   * Confirm path upserts via Supabase on (launch_id, window_type); a second import
   * with the same logical rows updates outcomes instead of inserting duplicates.
   */
  it("documents DB upsert as the idempotency mechanism for confirm", () => {
    const classified = classifyImportRows(
      [row({ rowIndex: 1, launchId: "launch-1", windowType: "7d" })],
      ctx
    );
    const key = upsertKeysForImportable(classified)[0];
    expect(key).toBe(outcomeUpsertKey("launch-1", "7d"));
    expect(key.split(":")).toEqual(["launch-1", "7d"]);
  });
});
