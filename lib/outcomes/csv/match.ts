import {
  OUTCOME_CURRENCIES,
  type ImportPreviewResult,
  type ImportPreviewRow,
  type NormalizedImportRow,
} from "@/lib/types/outcome";
import { resolveOutcomeWindow } from "@/lib/outcomes/validation";

export type MatchContext = {
  launchesById: Map<
    string,
    {
      id: string;
      analysis_id: string;
      platform: string;
      external_ad_id: string | null;
      variant_id: string | null;
    }
  >;
  launchesByExternal: Map<string, string>; // `${platform}:${external_ad_id}` → launch id
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

function validateWindow(row: NormalizedImportRow): string | null {
  if (row.windowType == null) {
    return "Window is required.";
  }
  try {
    const launchedAt = row.launchedAt ?? "1970-01-01";
    resolveOutcomeWindow({
      launchedAt,
      windowType: row.windowType,
      windowStart: row.windowStart,
      windowEnd: row.windowEnd,
    });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid window.";
  }
}

/** Identity used for in-file duplicate detection (before launch resolution). */
function matchOrCreateKey(row: NormalizedImportRow): string | null {
  if (row.launchId) return `launch:${row.launchId}`;
  if (row.platform && row.externalAdId) {
    return `ext:${row.platform}:${row.externalAdId}`;
  }
  if (row.analysisId) {
    return `create:${row.analysisId}:${row.variantId ?? ""}`;
  }
  return null;
}

function duplicateKey(row: NormalizedImportRow): string | null {
  const base = matchOrCreateKey(row);
  if (base == null || row.windowType == null) return null;
  return `${base}|${row.windowType}`;
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

function classifyOne(
  row: NormalizedImportRow,
  ctx: MatchContext
): Omit<ImportPreviewRow, "rowIndex" | "normalized"> {
  if (row.launchId && ctx.launchesById.has(row.launchId)) {
    return {
      status: "matched",
      reason: null,
      matchedLaunchId: row.launchId,
    };
  }

  if (row.platform && row.externalAdId) {
    const launchId = ctx.launchesByExternal.get(
      `${row.platform}:${row.externalAdId}`
    );
    if (launchId && ctx.launchesById.has(launchId)) {
      return {
        status: "matched",
        reason: null,
        matchedLaunchId: launchId,
      };
    }
  }

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
        try {
          resolveOutcomeWindow({
            launchedAt: row.launchedAt,
            windowType: row.windowType,
            windowStart: row.windowStart,
            windowEnd: row.windowEnd,
          });
          return {
            status: "create_launch",
            reason: null,
            matchedLaunchId: null,
          };
        } catch {
          // fall through to unmatched
        }
      }
    }
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
    const windowError = validateWindow(normalized);
    if (windowError) {
      return {
        rowIndex: normalized.rowIndex,
        status: "invalid",
        reason: windowError,
        normalized,
        matchedLaunchId: null,
      };
    }
    return {
      rowIndex: normalized.rowIndex,
      status: "unmatched",
      reason: null,
      normalized,
      matchedLaunchId: null,
    };
  });

  // In-file duplicates: keep last, mark earlier as duplicate.
  const lastIndexByKey = new Map<string, number>();
  for (let i = 0; i < preview.length; i++) {
    if (preview[i].status === "invalid") continue;
    const key = duplicateKey(preview[i].normalized);
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

  for (let i = 0; i < preview.length; i++) {
    const current = preview[i];
    if (current.status === "invalid" || current.status === "duplicate") {
      continue;
    }
    const classified = classifyOne(current.normalized, ctx);
    preview[i] = {
      ...current,
      ...classified,
    };
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
