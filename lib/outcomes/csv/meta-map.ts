import type { NormalizedImportRow } from "@/lib/types/outcome";
import { inferWindowType } from "@/lib/outcomes/csv/windows";

type MetaField =
  | "externalAdId"
  | "spend"
  | "impressions"
  | "clicks"
  | "purchases"
  | "leads"
  | "revenue"
  | "windowStart"
  | "windowEnd";

const ALIAS_TO_FIELD: Record<string, MetaField> = {
  "ad id": "externalAdId",
  "amount spent": "spend",
  "amount spent (usd)": "spend",
  spend: "spend",
  impressions: "impressions",
  "link clicks": "clicks",
  "clicks (all)": "clicks",
  clicks: "clicks",
  purchases: "purchases",
  "website purchases": "purchases",
  leads: "leads",
  "on-facebook leads": "leads",
  "website purchases conversion value": "revenue",
  "purchase conversion value": "revenue",
  "reporting starts": "windowStart",
  "reporting ends": "windowEnd",
};

function emptyToNull(value: string | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t === "" ? null : t;
}

function parseNumber(value: string | undefined): number | null {
  const t = emptyToNull(value);
  if (t == null) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function datePart(isoOrDate: string): string {
  return isoOrDate.slice(0, 10);
}

function resolveField(header: string): MetaField | null {
  const key = header.trim().toLowerCase();
  if (key.includes("roas")) return null;
  return ALIAS_TO_FIELD[key] ?? null;
}

export function normalizeMetaRows(
  headers: string[],
  rows: string[][]
): { rows: NormalizedImportRow[]; unknownColumns: string[] } {
  const fieldIndex = new Map<MetaField, number>();
  const unknownColumns: string[] = [];

  headers.forEach((header, i) => {
    const field = resolveField(header);
    if (field == null) {
      unknownColumns.push(header);
      return;
    }
    if (!fieldIndex.has(field)) fieldIndex.set(field, i);
  });

  const cell = (row: string[], field: MetaField): string | undefined => {
    const i = fieldIndex.get(field);
    return i == null ? undefined : row[i];
  };

  const normalized: NormalizedImportRow[] = rows.map((row, i) => {
    const windowStart = emptyToNull(cell(row, "windowStart"));
    const windowEnd = emptyToNull(cell(row, "windowEnd"));
    const windowType =
      windowStart && windowEnd
        ? inferWindowType(windowStart, windowEnd)
        : null;

    return {
      rowIndex: i + 1,
      launchId: null,
      analysisId: null,
      variantId: null,
      platform: "meta",
      externalAdId: emptyToNull(cell(row, "externalAdId")),
      externalCampaignId: null,
      launchedAt: windowStart ? datePart(windowStart) : null,
      windowType,
      windowStart,
      windowEnd,
      currency: "USD",
      metrics: {
        spend: parseNumber(cell(row, "spend")),
        impressions: parseNumber(cell(row, "impressions")),
        clicks: parseNumber(cell(row, "clicks")),
        purchases: parseNumber(cell(row, "purchases")),
        leads: parseNumber(cell(row, "leads")),
        revenue: parseNumber(cell(row, "revenue")),
      },
      notes: null,
      unknownColumns: [...unknownColumns],
    };
  });

  return { rows: normalized, unknownColumns };
}
