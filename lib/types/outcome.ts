export type LaunchPlatform = "meta" | "tiktok" | "other";
export type OutcomeWindowType = "3d" | "7d" | "14d";
export type ImportWindowType = OutcomeWindowType | "custom";

export type CsvFormat = "advara" | "meta";

export type NormalizedImportRow = {
  rowIndex: number; // 1-based data row number for UI
  launchId: string | null;
  analysisId: string | null;
  variantId: string | null;
  platform: LaunchPlatform | null;
  externalAdId: string | null;
  externalCampaignId: string | null;
  launchedAt: string | null; // yyyy-mm-dd
  windowType: ImportWindowType | null;
  windowStart: string | null;
  windowEnd: string | null;
  currency: string;
  metrics: RawOutcomeMetrics;
  notes: string | null;
  unknownColumns: string[];
};

export type ImportRowStatus =
  | "matched"
  | "create_launch"
  | "unmatched"
  | "invalid"
  | "duplicate";

export type ImportPreviewRow = {
  rowIndex: number;
  status: ImportRowStatus;
  reason: string | null;
  normalized: NormalizedImportRow;
  matchedLaunchId: string | null;
};

export type ImportPreviewResult = {
  format: CsvFormat;
  contentHash: string;
  filename: string;
  unknownColumns: string[];
  rows: ImportPreviewRow[];
  counts: {
    matched: number;
    createLaunch: number;
    unmatched: number;
    invalid: number;
    duplicate: number;
    importable: number;
  };
};
export type OutcomeSource = "manual" | "csv" | "api";
export type OutcomeLabel = "winner" | "break_even" | "loser" | "killed_early";

export type CreativeLaunch = {
  id: string;
  workspace_id: string;
  user_id: string;
  analysis_id: string;
  variant_id: string | null;
  platform: LaunchPlatform;
  launched_at: string;
  external_campaign_id: string | null;
  external_ad_id: string | null;
  notes: string | null;
  source: OutcomeSource;
  created_at: string;
  updated_at: string;
};

export type LaunchOutcome = {
  id: string;
  launch_id: string;
  workspace_id: string;
  user_id: string;
  window_type: OutcomeWindowType | "custom";
  window_start: string;
  window_end: string;
  currency: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  purchases: number | null;
  leads: number | null;
  revenue: number | null;
  outcome_label: OutcomeLabel | null;
  source: OutcomeSource;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
};

export type LaunchWithOutcomes = CreativeLaunch & {
  outcomes: LaunchOutcome[];
};

export type RawOutcomeMetrics = {
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  purchases: number | null;
  leads: number | null;
  revenue: number | null;
};

export type DerivedOutcomeMetrics = {
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
  conversionRate: number | null;
};

export type LogLaunchInput = {
  workspaceId: string;
  analysisId: string;
  variantId?: string | null;
  platform: LaunchPlatform;
  launchedAt: string; // ISO date (yyyy-mm-dd) from the date input
  externalCampaignId?: string;
  externalAdId?: string;
  notes?: string;
};

export type RecordOutcomeInput = {
  launchId: string;
  windowType: OutcomeWindowType;
  currency: string;
  metrics: RawOutcomeMetrics;
  outcomeLabel?: OutcomeLabel | null;
};

export const OUTCOME_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;

export const OUTCOME_WINDOW_DAYS: Record<OutcomeWindowType, number> = {
  "3d": 3,
  "7d": 7,
  "14d": 14,
};
