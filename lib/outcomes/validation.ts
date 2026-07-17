import {
  OUTCOME_CURRENCIES,
  OUTCOME_WINDOW_DAYS,
  type LogLaunchInput,
  type OutcomeWindowType,
  type RecordOutcomeInput,
} from "@/lib/types/outcome";

const PLATFORMS = new Set(["meta", "tiktok", "other"]);
const WINDOWS = new Set(Object.keys(OUTCOME_WINDOW_DAYS));
const LABELS = new Set(["winner", "break_even", "loser", "killed_early"]);
const DAY_MS = 24 * 60 * 60 * 1000;

function parseLaunchDate(launchedAt: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(launchedAt)) return null;
  const date = new Date(`${launchedAt}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function validateLaunchInput(input: LogLaunchInput): string[] {
  const errors: string[] = [];

  if (!input.workspaceId) errors.push("Workspace is required.");
  if (!input.analysisId) errors.push("Analysis is required.");
  if (!PLATFORMS.has(input.platform)) errors.push("Choose a valid platform.");

  const date = parseLaunchDate(input.launchedAt);
  if (!date) {
    errors.push("Enter a valid launch date.");
  } else if (date.getTime() > Date.now() + DAY_MS) {
    // +1 day of slack for timezone differences.
    errors.push("Launch date can't be in the future.");
  }

  if (input.externalAdId && input.externalAdId.trim().length > 120) {
    errors.push("Ad ID is too long.");
  }
  if (input.externalCampaignId && input.externalCampaignId.trim().length > 120) {
    errors.push("Campaign ID is too long.");
  }
  if (input.notes && input.notes.trim().length > 1000) {
    errors.push("Notes must be under 1,000 characters.");
  }

  return errors;
}

export function validateOutcomeInput(input: RecordOutcomeInput): string[] {
  const errors: string[] = [];
  const m = input.metrics;

  if (!input.launchId) errors.push("Launch is required.");
  if (!WINDOWS.has(input.windowType)) errors.push("Choose a valid window.");
  if (!OUTCOME_CURRENCIES.includes(input.currency as never)) {
    errors.push("Choose a supported currency.");
  }
  if (input.outcomeLabel != null && !LABELS.has(input.outcomeLabel)) {
    errors.push("Choose a valid outcome label.");
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
      errors.push(`${label} must be a non-negative number.`);
    }
  }

  if (m.impressions != null && m.clicks != null && m.clicks > m.impressions) {
    errors.push("Clicks can't exceed impressions.");
  }
  if (m.clicks != null && m.purchases != null && m.purchases > m.clicks) {
    errors.push("Purchases can't exceed clicks.");
  }
  if (m.clicks != null && m.leads != null && m.leads > m.clicks) {
    errors.push("Leads can't exceed clicks.");
  }

  const hasAnyMetric = fields.some(([, value]) => value != null);
  if (!hasAnyMetric) {
    errors.push("Enter at least one metric.");
  }

  return errors;
}

/** Fixed windows always start at the launch date (midnight UTC). */
export function resolveWindow(
  launchedAt: string,
  windowType: OutcomeWindowType
): { windowStart: string; windowEnd: string } {
  const startDate = launchedAt.slice(0, 10);
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(start.getTime() + OUTCOME_WINDOW_DAYS[windowType] * DAY_MS);
  return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
}
