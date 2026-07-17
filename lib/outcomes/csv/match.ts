import {
  OUTCOME_CURRENCIES,
  type ImportPreviewResult,
  type ImportPreviewRow,
  type NormalizedImportRow,
} from "@/lib/types/outcome";
import { resolveOutcomeWindow } from "@/lib/outcomes/validation";

export type MatchLaunch = {
  id: string;
  analysis_id: string;
  platform: string;
  external_ad_id: string | null;
  variant_id: string | null;
  launched_at: string;
};

export type MatchContext = {
  launchesById: Map<string, MatchLaunch>;
  launchesByExternal: Map<string, string>; // `${platform}:${external_ad_id}` → launch id
  /** Unique `${analysis_id}:${variant_id ?? ''}` → launch id. Omit ambiguous keys. */
  launchesByAnalysisVariant: Map<string, string>;
  /** Keys with more than one launch for the same analysis/variant. */
  ambiguousAnalysisVariants: Set<string>;
  analysesById: Map<
    string,
    {
      id: string;
      status: string;
      analysis_mode: string;
      variants: Array<{ id: string }>;
    }
  >;
};

const UNMATCHED_GUIDANCE =
  "Log launch first or use Advara template with analysis_id";

const AMBIGUOUS_ANALYSIS_VARIANT =
  "Multiple launches for this analysis/variant; use launch_id";

function analysisVariantKey(
  analysisId: string,
  variantId: string | null
): string {
  return `${analysisId}:${variantId ?? ""}`;
}

function validateMetrics(row: NormalizedImportRow): string | null {
  const m = row.metrics;
  if (!OUTCOME_CURRENCIES.includes(row.currency as never)) {
    return "Choose a supported currency.";
  }

  const fields: Array<[string, number | null]> = [
    ["Spend", m.spend],
    ["Impressions", m.impressions],
    ["Clicks", m.clicks],
    ["Purchases", m.purchases],
    ["Leads", m.leads],
    ["Revenue", m.revenue],
  ];
  for (const [label, value] of fields) {
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      return `${label} must be a non-negative number.`;
    }
  }
  if (m.impressions != null && m.clicks != null && m.clicks > m.impressions) {
    return "Clicks can't exceed impressions.";
  }
  if (m.clicks != null && m.purchases != null && m.purchases > m.clicks) {
    return "Purchases can't exceed clicks.";
  }
  if (m.clicks != null && m.leads != null && m.leads > m.clicks) {
    return "Leads can't exceed clicks.";
  }
  if (!fields.some(([, value]) => value != null)) {
    return "Enter at least one metric.";
  }
  return null;
}

function validateWindow(
  row: NormalizedImportRow,
  launchedAt: string | null
): string | null {
  if (row.windowType == null) {
    return "Window is required.";
  }
  try {
    resolveOutcomeWindow({
      launchedAt: launchedAt ?? "1970-01-01",
      windowType: row.windowType,
      windowStart: row.windowStart,
      windowEnd: row.windowEnd,
    });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid window.";
  }
}

function variantRulesOk(
  row: NormalizedImportRow,
  analysis: { analysis_mode: string; variants: Array<{ id: string }> }
): { ok: true } | { ok: false; reason: string } {
  if (analysis.analysis_mode === "comparison") {
    if (!row.variantId) {
      return { ok: false, reason: "Choose which variant you launched." };
    }
    if (!analysis.variants.some((v) => v.id === row.variantId)) {
      return { ok: false, reason: "Variant not found on this analysis." };
    }
    return { ok: true };
  }
  if (row.variantId) {
    return { ok: false, reason: "This analysis has no variants." };
  }
  return { ok: true };
}

function resolvedDuplicateKey(row: ImportPreviewRow): string | null {
  const windowType = row.normalized.windowType;
  if (windowType == null) return null;

  if (row.status === "matched" && row.matchedLaunchId) {
    return `launch:${row.matchedLaunchId}|${windowType}`;
  }
  if (row.status === "create_launch" && row.normalized.analysisId) {
    return `create:${row.normalized.analysisId}:${row.normalized.variantId ?? ""}|${windowType}`;
  }
  return null;
}

function classifyOne(
  row: NormalizedImportRow,
  ctx: MatchContext
): Omit<ImportPreviewRow, "rowIndex" | "normalized"> {
  // 2. launch_id — explicit ID must resolve; never fall through
  if (row.launchId) {
    const launch = ctx.launchesById.get(row.launchId);
    if (!launch) {
      return {
        status: "unmatched",
        reason: "Launch ID not found in this workspace.",
        matchedLaunchId: null,
      };
    }
    const windowError = validateWindow(
      row,
      row.launchedAt ?? launch.launched_at
    );
    if (windowError) {
      return {
        status: "invalid",
        reason: windowError,
        matchedLaunchId: null,
      };
    }
    return {
      status: "matched",
      reason: null,
      matchedLaunchId: launch.id,
    };
  }

  // 3. analysis_id + variant_id → existing launch
  if (row.analysisId) {
    const analysis = ctx.analysesById.get(row.analysisId);
    if (analysis) {
      const variants = variantRulesOk(row, analysis);
      if (!variants.ok) {
        return {
          status: "unmatched",
          reason: variants.reason,
          matchedLaunchId: null,
        };
      }
    }

    const key = analysisVariantKey(row.analysisId, row.variantId);
    if (ctx.ambiguousAnalysisVariants.has(key)) {
      return {
        status: "unmatched",
        reason: AMBIGUOUS_ANALYSIS_VARIANT,
        matchedLaunchId: null,
      };
    }

    const byVariant = ctx.launchesByAnalysisVariant.get(key);
    if (byVariant) {
      const launch = ctx.launchesById.get(byVariant);
      if (launch) {
        const windowError = validateWindow(
          row,
          row.launchedAt ?? launch.launched_at
        );
        if (windowError) {
          return {
            status: "invalid",
            reason: windowError,
            matchedLaunchId: null,
          };
        }
        return {
          status: "matched",
          reason: null,
          matchedLaunchId: launch.id,
        };
      }
    }
  }

  // 4. platform + external_ad_id
  if (row.platform && row.externalAdId) {
    const launchId = ctx.launchesByExternal.get(
      `${row.platform}:${row.externalAdId}`
    );
    if (launchId) {
      const launch = ctx.launchesById.get(launchId);
      if (launch) {
        const windowError = validateWindow(
          row,
          row.launchedAt ?? launch.launched_at
        );
        if (windowError) {
          return {
            status: "invalid",
            reason: windowError,
            matchedLaunchId: null,
          };
        }
        return {
          status: "matched",
          reason: null,
          matchedLaunchId: launch.id,
        };
      }
    }
  }

  // 5. create_launch when analysis is createable
  if (row.analysisId) {
    const analysis = ctx.analysesById.get(row.analysisId);
    if (analysis && analysis.status === "completed") {
      const variants = variantRulesOk(row, analysis);
      if (!variants.ok) {
        return {
          status: "unmatched",
          reason: variants.reason,
          matchedLaunchId: null,
        };
      }
      if (row.platform && row.launchedAt && row.windowType != null) {
        const windowError = validateWindow(row, row.launchedAt);
        if (windowError) {
          return {
            status: "invalid",
            reason: windowError,
            matchedLaunchId: null,
          };
        }
        return {
          status: "create_launch",
          reason: null,
          matchedLaunchId: null,
        };
      }
    }
  }

  // Validate window for remaining rows (custom / row-provided dates)
  const earlyWindow = validateWindow(row, row.launchedAt);
  if (earlyWindow) {
    return {
      status: "invalid",
      reason: earlyWindow,
      matchedLaunchId: null,
    };
  }

  return {
    status: "unmatched",
    reason: UNMATCHED_GUIDANCE,
    matchedLaunchId: null,
  };
}

export function classifyImportRows(
  rows: NormalizedImportRow[],
  ctx: MatchContext
): ImportPreviewRow[] {
  const preview: ImportPreviewRow[] = rows.map((normalized) => {
    const metricError = validateMetrics(normalized);
    if (metricError) {
      return {
        rowIndex: normalized.rowIndex,
        status: "invalid",
        reason: metricError,
        normalized,
        matchedLaunchId: null,
      };
    }
    const classified = classifyOne(normalized, ctx);
    return {
      rowIndex: normalized.rowIndex,
      ...classified,
      normalized,
    };
  });

  // In-file duplicates after resolution: keep last, mark earlier as duplicate.
  const lastIndexByKey = new Map<string, number>();
  for (let i = 0; i < preview.length; i++) {
    const current = preview[i];
    if (
      current.status !== "matched" &&
      current.status !== "create_launch"
    ) {
      continue;
    }
    const key = resolvedDuplicateKey(current);
    if (key == null) continue;
    const prev = lastIndexByKey.get(key);
    if (prev != null) {
      preview[prev] = {
        ...preview[prev],
        status: "duplicate",
        reason: "Duplicate row; later row will be imported.",
        matchedLaunchId: null,
      };
    }
    lastIndexByKey.set(key, i);
  }

  return preview;
}

export function buildPreviewCounts(
  rows: ImportPreviewRow[]
): ImportPreviewResult["counts"] {
  const counts = {
    matched: 0,
    createLaunch: 0,
    unmatched: 0,
    invalid: 0,
    duplicate: 0,
    importable: 0,
  };
  for (const row of rows) {
    switch (row.status) {
      case "matched":
        counts.matched++;
        counts.importable++;
        break;
      case "create_launch":
        counts.createLaunch++;
        counts.importable++;
        break;
      case "unmatched":
        counts.unmatched++;
        break;
      case "invalid":
        counts.invalid++;
        break;
      case "duplicate":
        counts.duplicate++;
        break;
    }
  }
  return counts;
}
