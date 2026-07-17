"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  resolveOutcomeWindow,
  resolveWindow,
  validateLaunchInput,
  validateOutcomeInput,
} from "@/lib/outcomes/validation";
import {
  buildImportPreviewFromCsvText,
  buildMatchContext,
  importablePreviewRows,
} from "@/lib/outcomes/csv/pipeline";
import type { MatchLaunch } from "@/lib/outcomes/csv/match";
import type {
  CreativeLaunch,
  ImportPreviewResult,
  ImportPreviewRow,
  LaunchOutcome,
  LogLaunchInput,
  RecordOutcomeInput,
} from "@/lib/types/outcome";
import type { StoredAnalysisVariant } from "@/lib/types/comparison";

export type LaunchActionResult =
  | { success: true; launch: CreativeLaunch }
  | { success: false; error: string };

export type OutcomeActionResult =
  | { success: true; outcome: LaunchOutcome }
  | { success: false; error: string };

export async function logLaunch(
  input: LogLaunchInput
): Promise<LaunchActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const errors = validateLaunchInput(input);
  if (errors.length > 0) return { success: false, error: errors[0] };

  // Ownership: the analysis must belong to this user in this workspace.
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, workspace_id, status, analysis_mode, variants")
    .eq("id", input.analysisId)
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!analysis) return { success: false, error: "Analysis not found." };
  if (analysis.status !== "completed") {
    return { success: false, error: "Only completed analyses can be launched." };
  }

  // Comparison analyses must launch a specific variant; funnel analyses must not.
  const variants = (analysis.variants ?? []) as StoredAnalysisVariant[];
  if (analysis.analysis_mode === "comparison") {
    if (!input.variantId) {
      return { success: false, error: "Choose which variant you launched." };
    }
    if (!variants.some((v) => v.id === input.variantId)) {
      return { success: false, error: "Variant not found on this analysis." };
    }
  } else if (input.variantId) {
    return { success: false, error: "This analysis has no variants." };
  }

  const { data: launch, error } = await supabase
    .from("creative_launches")
    .insert({
      workspace_id: input.workspaceId,
      user_id: user.id,
      analysis_id: input.analysisId,
      variant_id: input.variantId ?? null,
      platform: input.platform,
      launched_at: `${input.launchedAt.slice(0, 10)}T00:00:00.000Z`,
      external_campaign_id: input.externalCampaignId?.trim() || null,
      external_ad_id: input.externalAdId?.trim() || null,
      notes: input.notes?.trim() || null,
      source: "manual",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "That ad ID is already tracked." };
    }
    return { success: false, error: error.message };
  }

  revalidatePath(`/report/${input.analysisId}`);
  revalidatePath("/performance");

  return { success: true, launch: launch as CreativeLaunch };
}

export async function recordOutcome(
  input: RecordOutcomeInput
): Promise<OutcomeActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const errors = validateOutcomeInput(input);
  if (errors.length > 0) return { success: false, error: errors[0] };

  const { data: launch } = await supabase
    .from("creative_launches")
    .select("id, workspace_id, analysis_id, launched_at")
    .eq("id", input.launchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!launch) return { success: false, error: "Launch not found." };

  let windowStart: string;
  let windowEnd: string;
  try {
    ({ windowStart, windowEnd } = resolveWindow(
      launch.launched_at,
      input.windowType
    ));
  } catch {
    return { success: false, error: "Invalid launch date for this outcome." };
  }

  // Upsert on (launch_id, window_type): re-entering a window updates it.
  const { data: outcome, error } = await supabase
    .from("launch_outcomes")
    .upsert(
      {
        launch_id: launch.id,
        workspace_id: launch.workspace_id,
        user_id: user.id,
        window_type: input.windowType,
        window_start: windowStart,
        window_end: windowEnd,
        currency: input.currency,
        spend: input.metrics.spend,
        impressions: input.metrics.impressions,
        clicks: input.metrics.clicks,
        purchases: input.metrics.purchases,
        leads: input.metrics.leads,
        revenue: input.metrics.revenue,
        outcome_label: input.outcomeLabel ?? null,
        source: "manual",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "launch_id,window_type" }
    )
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/report/${launch.analysis_id}`);
  revalidatePath("/performance");

  return { success: true, outcome: outcome as LaunchOutcome };
}

export async function deleteLaunch(
  launchId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: launch } = await supabase
    .from("creative_launches")
    .select("id, analysis_id")
    .eq("id", launchId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!launch) return { success: false, error: "Launch not found." };

  const { error } = await supabase
    .from("creative_launches")
    .delete()
    .eq("id", launchId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/report/${launch.analysis_id}`);
  revalidatePath("/performance");

  return { success: true };
}

function isMissingOutcomeImportsTable(error: {
  message?: string;
  code?: string;
}): boolean {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (msg.includes("outcome_imports") &&
      (msg.includes("schema cache") ||
        msg.includes("does not exist") ||
        msg.includes("could not find")))
  );
}

async function loadCsvMatchContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  userId: string
): Promise<
  | { success: true; ctx: ReturnType<typeof buildMatchContext> }
  | { success: false; error: string }
> {
  const [launchesRes, analysesRes] = await Promise.all([
    supabase
      .from("creative_launches")
      .select(
        "id, analysis_id, platform, external_ad_id, variant_id, launched_at"
      )
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId),
    supabase
      .from("analyses")
      .select("id, status, analysis_mode, variants")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "completed"),
  ]);

  if (launchesRes.error) {
    return { success: false, error: launchesRes.error.message };
  }
  if (analysesRes.error) {
    return { success: false, error: analysesRes.error.message };
  }

  const launches = (launchesRes.data ?? []).map((row) => ({
    id: row.id as string,
    analysis_id: row.analysis_id as string,
    platform: row.platform as string,
    external_ad_id: (row.external_ad_id as string | null) ?? null,
    variant_id: (row.variant_id as string | null) ?? null,
    launched_at: String(row.launched_at).slice(0, 10),
  })) satisfies MatchLaunch[];

  const analyses = (analysesRes.data ?? []).map((row) => ({
    id: row.id as string,
    status: row.status as string,
    analysis_mode: (row.analysis_mode as string) ?? "funnel",
    variants: (row.variants ?? null) as StoredAnalysisVariant[] | null,
  }));

  return {
    success: true,
    ctx: buildMatchContext({ launches, analyses }),
  };
}

async function runCsvPreviewPipeline(input: {
  workspaceId: string;
  filename: string;
  csvText: string;
}): Promise<
  | {
      success: true;
      preview: ImportPreviewResult;
      userId: string;
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", input.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!workspace) {
    return { success: false, error: "Workspace not found." };
  }

  const match = await loadCsvMatchContext(
    supabase,
    input.workspaceId,
    user.id
  );
  if (!match.success) return match;

  const built = buildImportPreviewFromCsvText(
    input.csvText,
    input.filename,
    match.ctx
  );
  if (!built.success) return built;

  return {
    success: true,
    preview: built.preview,
    userId: user.id,
    supabase,
  };
}

export async function previewCsvImport(input: {
  workspaceId: string;
  filename: string;
  csvText: string;
}): Promise<
  | { success: true; preview: ImportPreviewResult }
  | { success: false; error: string }
> {
  const result = await runCsvPreviewPipeline(input);
  if (!result.success) return result;
  return { success: true, preview: result.preview };
}

export async function confirmCsvImport(input: {
  workspaceId: string;
  filename: string;
  csvText: string;
}): Promise<
  | {
      success: true;
      summary: {
        importId: string;
        createdLaunches: number;
        createdOutcomes: number;
        updatedOutcomes: number;
        skipped: number;
        invalid: number;
      };
    }
  | { success: false; error: string }
> {
  const previewed = await runCsvPreviewPipeline(input);
  if (!previewed.success) return previewed;

  const { preview, userId, supabase } = previewed;
  const importable = importablePreviewRows(preview);
  const skipped =
    preview.counts.unmatched + preview.counts.duplicate;
  const invalid = preview.counts.invalid;

  if (importable.length === 0) {
    return {
      success: false,
      error: "No importable rows. Fix unmatched or invalid rows and try again.",
    };
  }

  const { data: importRow, error: importError } = await supabase
    .from("outcome_imports")
    .insert({
      workspace_id: input.workspaceId,
      user_id: userId,
      filename: input.filename,
      format: preview.format,
      content_hash: preview.contentHash,
      row_counts: preview.counts,
    })
    .select("id")
    .single();

  if (importError || !importRow) {
    if (importError && isMissingOutcomeImportsTable(importError)) {
      return {
        success: false,
        error:
          "outcome_imports table is missing. Run migration 20260719000000_outcome_imports.sql in Supabase.",
      };
    }
    return {
      success: false,
      error: importError?.message ?? "Failed to create import ledger row.",
    };
  }

  const importId = importRow.id as string;
  let createdLaunches = 0;
  let createdOutcomes = 0;
  let updatedOutcomes = 0;
  const createdLaunchByKey = new Map<string, string>();
  const reportPaths = new Set<string>();

  for (const row of importable) {
    const resolved = await resolveOrCreateLaunchForImport({
      supabase,
      workspaceId: input.workspaceId,
      userId,
      row,
      createdLaunchByKey,
    });
    if (!resolved.success) {
      return { success: false, error: resolved.error };
    }
    if (resolved.created) createdLaunches++;
    reportPaths.add(`/report/${resolved.analysisId}`);

    const n = row.normalized;
    if (n.windowType == null) {
      return { success: false, error: `Row ${n.rowIndex}: window is required.` };
    }

    let window: ReturnType<typeof resolveOutcomeWindow>;
    try {
      window = resolveOutcomeWindow({
        launchedAt: resolved.launchedAt,
        windowType: n.windowType,
        windowStart: n.windowStart,
        windowEnd: n.windowEnd,
      });
    } catch (err) {
      return {
        success: false,
        error:
          err instanceof Error
            ? `Row ${n.rowIndex}: ${err.message}`
            : `Row ${n.rowIndex}: invalid window.`,
      };
    }

    const { data: existing } = await supabase
      .from("launch_outcomes")
      .select("id, outcome_label")
      .eq("launch_id", resolved.launchId)
      .eq("window_type", window.windowType)
      .maybeSingle();

    const { error: outcomeError } = await supabase
      .from("launch_outcomes")
      .upsert(
        {
          launch_id: resolved.launchId,
          workspace_id: input.workspaceId,
          user_id: userId,
          window_type: window.windowType,
          window_start: window.windowStart,
          window_end: window.windowEnd,
          currency: n.currency,
          spend: n.metrics.spend,
          impressions: n.metrics.impressions,
          clicks: n.metrics.clicks,
          purchases: n.metrics.purchases,
          leads: n.metrics.leads,
          revenue: n.metrics.revenue,
          outcome_label: existing?.outcome_label ?? null,
          source: "csv",
          source_ref: importId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "launch_id,window_type" }
      );

    if (outcomeError) {
      return { success: false, error: outcomeError.message };
    }

    if (existing) updatedOutcomes++;
    else createdOutcomes++;
  }

  revalidatePath("/performance");
  for (const path of reportPaths) {
    revalidatePath(path);
  }

  return {
    success: true,
    summary: {
      importId,
      createdLaunches,
      createdOutcomes,
      updatedOutcomes,
      skipped,
      invalid,
    },
  };
}

async function resolveOrCreateLaunchForImport(args: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceId: string;
  userId: string;
  row: ImportPreviewRow;
  createdLaunchByKey: Map<string, string>;
}): Promise<
  | {
      success: true;
      launchId: string;
      analysisId: string;
      launchedAt: string;
      created: boolean;
    }
  | { success: false; error: string }
> {
  const { supabase, workspaceId, userId, row, createdLaunchByKey } = args;
  const n = row.normalized;

  if (row.status === "matched" && row.matchedLaunchId) {
    const { data: launch } = await supabase
      .from("creative_launches")
      .select("id, analysis_id, launched_at")
      .eq("id", row.matchedLaunchId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!launch) {
      return {
        success: false,
        error: `Row ${n.rowIndex}: matched launch no longer exists.`,
      };
    }

    return {
      success: true,
      launchId: launch.id as string,
      analysisId: launch.analysis_id as string,
      launchedAt: n.launchedAt ?? String(launch.launched_at).slice(0, 10),
      created: false,
    };
  }

  if (row.status !== "create_launch" || !n.analysisId || !n.platform || !n.launchedAt) {
    return {
      success: false,
      error: `Row ${n.rowIndex}: cannot resolve launch.`,
    };
  }

  const key = `${n.analysisId}:${n.variantId ?? ""}:${n.platform}:${n.externalAdId ?? ""}`;
  const alreadyCreated = createdLaunchByKey.get(key);
  if (alreadyCreated) {
    return {
      success: true,
      launchId: alreadyCreated,
      analysisId: n.analysisId,
      launchedAt: n.launchedAt,
      created: false,
    };
  }

  const { data: launch, error } = await supabase
    .from("creative_launches")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      analysis_id: n.analysisId,
      variant_id: n.variantId,
      platform: n.platform,
      launched_at: `${n.launchedAt.slice(0, 10)}T00:00:00.000Z`,
      external_campaign_id: n.externalCampaignId,
      external_ad_id: n.externalAdId,
      notes: n.notes,
      source: "csv",
    })
    .select("id, analysis_id, launched_at")
    .single();

  if (error || !launch) {
    if (error?.code === "23505") {
      // Race / unique external_ad_id: look up existing and reuse.
      if (n.externalAdId) {
        const { data: existing } = await supabase
          .from("creative_launches")
          .select("id, analysis_id, launched_at")
          .eq("workspace_id", workspaceId)
          .eq("platform", n.platform)
          .eq("external_ad_id", n.externalAdId)
          .maybeSingle();
        if (existing) {
          createdLaunchByKey.set(key, existing.id as string);
          return {
            success: true,
            launchId: existing.id as string,
            analysisId: existing.analysis_id as string,
            launchedAt:
              n.launchedAt ?? String(existing.launched_at).slice(0, 10),
            created: false,
          };
        }
      }
      return {
        success: false,
        error: `Row ${n.rowIndex}: that ad ID is already tracked.`,
      };
    }
    return {
      success: false,
      error: error?.message ?? `Row ${n.rowIndex}: failed to create launch.`,
    };
  }

  createdLaunchByKey.set(key, launch.id as string);
  return {
    success: true,
    launchId: launch.id as string,
    analysisId: launch.analysis_id as string,
    launchedAt: n.launchedAt,
    created: true,
  };
}
