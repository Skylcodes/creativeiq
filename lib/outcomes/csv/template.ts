export const ADVARA_CSV_HEADERS = [
  "launch_id",
  "analysis_id",
  "variant_id",
  "platform",
  "external_ad_id",
  "external_campaign_id",
  "launched_at",
  "window",
  "window_start",
  "window_end",
  "currency",
  "spend",
  "impressions",
  "clicks",
  "purchases",
  "leads",
  "revenue",
  "notes",
] as const;

export function buildAdvaraTemplateCsv(): string {
  return `${ADVARA_CSV_HEADERS.join(",")}\n`;
}
