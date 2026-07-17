"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  resolveWindow,
  validateLaunchInput,
  validateOutcomeInput,
} from "@/lib/outcomes/validation";
import type {
  CreativeLaunch,
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
