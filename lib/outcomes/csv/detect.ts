const ADVARA_FINGERPRINT = new Set([
  "launch_id",
  "analysis_id",
  "spend",
  "window",
  "platform",
]);

export function detectCsvFormat(
  headers: string[]
): "advara" | "meta" | "unknown" {
  const lower = headers.map((h) => h.trim().toLowerCase());

  let advaraHits = 0;
  for (const h of lower) {
    if (ADVARA_FINGERPRINT.has(h)) advaraHits++;
  }
  if (advaraHits >= 4) return "advara";

  const hasAdId = lower.includes("ad id");
  const hasSpendOrImpressions =
    lower.includes("amount spent") || lower.includes("impressions");
  if (hasAdId && hasSpendOrImpressions) return "meta";

  return "unknown";
}
