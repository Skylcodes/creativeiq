import type {
  CsvFormat,
  ImportPreviewResult,
  ImportPreviewRow,
} from "@/lib/types/outcome";
import type { StoredAnalysisVariant } from "@/lib/types/comparison";
import { parseCsv } from "@/lib/outcomes/csv/parse";
import { detectCsvFormat } from "@/lib/outcomes/csv/detect";
import { normalizeAdvaraRows } from "@/lib/outcomes/csv/normalize";
import { normalizeMetaRows } from "@/lib/outcomes/csv/meta-map";
import { hashCsvContent } from "@/lib/outcomes/csv/hash";
import { buildImportPreview } from "@/lib/outcomes/csv/import";
import {
  type MatchContext,
  type MatchLaunch,
} from "@/lib/outcomes/csv/match";

export type AnalysisMatchRow = {
  id: string;
  status: string;
  analysis_mode: string;
  variants: StoredAnalysisVariant[] | null;
};

function analysisVariantKey(
  analysisId: string,
  variantId: string | null
): string {
  return `${analysisId}:${variantId ?? ""}`;
}

/** Build MatchContext indexes from workspace launches + analyses. */
export function buildMatchContext(args: {
  launches: MatchLaunch[];
  analyses: AnalysisMatchRow[];
}): MatchContext {
  const launchesById = new Map<string, MatchLaunch>();
  const launchesByExternal = new Map<string, string>();
  const launchesByAnalysisVariant = new Map<string, string>();
  const ambiguousAnalysisVariants = new Set<string>();
  const seenAnalysisVariant = new Map<string, string>();

  for (const launch of args.launches) {
    launchesById.set(launch.id, launch);

    if (launch.external_ad_id) {
      launchesByExternal.set(
        `${launch.platform}:${launch.external_ad_id}`,
        launch.id
      );
    }

    const key = analysisVariantKey(launch.analysis_id, launch.variant_id);
    if (ambiguousAnalysisVariants.has(key)) continue;
    const existing = seenAnalysisVariant.get(key);
    if (existing == null) {
      seenAnalysisVariant.set(key, launch.id);
      launchesByAnalysisVariant.set(key, launch.id);
    } else if (existing !== launch.id) {
      ambiguousAnalysisVariants.add(key);
      launchesByAnalysisVariant.delete(key);
    }
  }

  const analysesById = new Map<
    string,
    {
      id: string;
      status: string;
      analysis_mode: string;
      variants: Array<{ id: string }>;
    }
  >();
  for (const analysis of args.analyses) {
    analysesById.set(analysis.id, {
      id: analysis.id,
      status: analysis.status,
      analysis_mode: analysis.analysis_mode,
      variants: (analysis.variants ?? []).map((v) => ({ id: v.id })),
    });
  }

  return {
    launchesById,
    launchesByExternal,
    launchesByAnalysisVariant,
    ambiguousAnalysisVariants,
    analysesById,
  };
}

/**
 * Parse → detect → normalize → classify. Pure (no DB). Throws on parse errors;
 * returns error result for unknown format.
 */
export function buildImportPreviewFromCsvText(
  csvText: string,
  filename: string,
  ctx: MatchContext
):
  | { success: true; preview: ImportPreviewResult }
  | { success: false; error: string } {
  let headers: string[];
  let rows: string[][];
  try {
    ({ headers, rows } = parseCsv(csvText));
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to parse CSV.",
    };
  }

  const detected = detectCsvFormat(headers);
  if (detected === "unknown") {
    return {
      success: false,
      error:
        "Unrecognized CSV format. Download the Advara template or export from Meta Ads Manager.",
    };
  }

  const format: CsvFormat = detected;
  const normalized =
    format === "advara"
      ? normalizeAdvaraRows(headers, rows)
      : normalizeMetaRows(headers, rows);

  const preview = buildImportPreview({
    format,
    contentHash: hashCsvContent(csvText),
    filename,
    unknownColumns: normalized.unknownColumns,
    rows: normalized.rows,
    ctx,
  });

  return { success: true, preview };
}

export function importablePreviewRows(
  preview: ImportPreviewResult
): ImportPreviewRow[] {
  return preview.rows.filter(
    (row) => row.status === "matched" || row.status === "create_launch"
  );
}
