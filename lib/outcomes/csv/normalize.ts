import type {
  ImportWindowType,
  LaunchPlatform,
  NormalizedImportRow,
} from "@/lib/types/outcome";
import { ADVARA_CSV_HEADERS } from "@/lib/outcomes/csv/template";
import { inferWindowType } from "@/lib/outcomes/csv/windows";

const KNOWN = new Set<string>(ADVARA_CSV_HEADERS);
const PLATFORMS = new Set<string>(["meta", "tiktok", "other"]);
const WINDOWS = new Set<string>(["3d", "7d", "14d", "custom"]);

function emptyToNull(value: string | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t === "" ? null : t;
}

function parseNumber(value: string | undefined): number | null {
  const t = emptyToNull(value);
  if (t == null) return null;
  return Number(t);
}

function parsePlatform(value: string | undefined): LaunchPlatform | null {
  const t = emptyToNull(value);
  if (t == null) return null;
  return PLATFORMS.has(t) ? (t as LaunchPlatform) : null;
}

function parseWindowType(value: string | undefined): ImportWindowType | null {
  const t = emptyToNull(value);
  if (t == null) return null;
  return WINDOWS.has(t) ? (t as ImportWindowType) : null;
}

export function normalizeAdvaraRows(
  headers: string[],
  rows: string[][]
): { rows: NormalizedImportRow[]; unknownColumns: string[] } {
  const unknownColumns = headers.filter((h) => !KNOWN.has(h));
  const index = new Map<string, number>();
  headers.forEach((h, i) => {
    if (KNOWN.has(h) && !index.has(h)) index.set(h, i);
  });

  const cell = (row: string[], name: string): string | undefined => {
    const i = index.get(name);
    return i == null ? undefined : row[i];
  };

  const normalized: NormalizedImportRow[] = rows.map((row, i) => {
    let windowType = parseWindowType(cell(row, "window"));
    const windowStart = emptyToNull(cell(row, "window_start"));
    const windowEnd = emptyToNull(cell(row, "window_end"));
    if (windowType == null && windowStart && windowEnd) {
      windowType = inferWindowType(windowStart, windowEnd);
    }

    return {
      rowIndex: i + 1,
      launchId: emptyToNull(cell(row, "launch_id")),
      analysisId: emptyToNull(cell(row, "analysis_id")),
      variantId: emptyToNull(cell(row, "variant_id")),
      platform: parsePlatform(cell(row, "platform")),
      externalAdId: emptyToNull(cell(row, "external_ad_id")),
      externalCampaignId: emptyToNull(cell(row, "external_campaign_id")),
      launchedAt: emptyToNull(cell(row, "launched_at")),
      windowType,
      windowStart,
      windowEnd,
      currency: emptyToNull(cell(row, "currency")) ?? "USD",
      metrics: {
        spend: parseNumber(cell(row, "spend")),
        impressions: parseNumber(cell(row, "impressions")),
        clicks: parseNumber(cell(row, "clicks")),
        purchases: parseNumber(cell(row, "purchases")),
        leads: parseNumber(cell(row, "leads")),
        revenue: parseNumber(cell(row, "revenue")),
      },
      notes: emptyToNull(cell(row, "notes")),
      unknownColumns: [...unknownColumns],
    };
  });

  return { rows: normalized, unknownColumns };
}
