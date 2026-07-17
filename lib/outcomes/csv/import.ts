import type {
  CsvFormat,
  ImportPreviewResult,
  NormalizedImportRow,
} from "@/lib/types/outcome";
import {
  buildPreviewCounts,
  classifyImportRows,
  type MatchContext,
} from "@/lib/outcomes/csv/match";

export function buildImportPreview(args: {
  format: CsvFormat;
  contentHash: string;
  filename: string;
  unknownColumns: string[];
  rows: NormalizedImportRow[];
  ctx: MatchContext;
}): ImportPreviewResult {
  const rows = classifyImportRows(args.rows, args.ctx);
  return {
    format: args.format,
    contentHash: args.contentHash,
    filename: args.filename,
    unknownColumns: args.unknownColumns,
    rows,
    counts: buildPreviewCounts(rows),
  };
}
