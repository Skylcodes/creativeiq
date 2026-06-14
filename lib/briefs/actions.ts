"use server";

import { revalidatePath } from "next/cache";
import { BRIEF_GOALS, BRIEF_PLATFORMS } from "@/lib/briefs/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  BriefWizardInput,
  CreateBriefInput,
  CreativeBrief,
} from "@/lib/types/brief";

export type BriefActionResult =
  | { success: true; brief: CreativeBrief }
  | { success: false; error: string };

function buildBriefTitle(input: BriefWizardInput): string {
  const goal =
    BRIEF_GOALS.find((g) => g.id === input.goal)?.label ?? input.goal;
  const platform =
    BRIEF_PLATFORMS.find((p) => p.id === input.platform)?.label ??
    input.platform;
  return `${goal} · ${platform}`;
}

export async function createBrief(
  input: CreateBriefInput
): Promise<BriefActionResult> {
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

  if (!workspace) return { success: false, error: "Workspace not found." };

  const title = buildBriefTitle(input.input);
  const now = new Date().toISOString();
  const generationPhase =
    input.input.angleMode === "surprise_me" ? "angles" : "full_brief";

  const { data: brief, error } = await supabase
    .from("creative_briefs")
    .insert({
      workspace_id: input.workspaceId,
      user_id: user.id,
      title,
      status: "processing",
      generation_phase: generationPhase,
      input: input.input,
      processing_started_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/brief");
  revalidatePath("/dashboard");

  return { success: true, brief: brief as CreativeBrief };
}

export async function selectBriefAngle(
  briefId: string,
  angleId: string
): Promise<BriefActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "You must be signed in." };

  const now = new Date().toISOString();

  const { data: brief, error } = await supabase
    .from("creative_briefs")
    .update({
      selected_angle_id: angleId,
      status: "processing",
      generation_phase: "full_brief",
      processing_started_at: now,
      error_message: null,
      updated_at: now,
    })
    .eq("id", briefId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/brief/${briefId}`);

  return { success: true, brief: brief as CreativeBrief };
}

export async function resetBriefForRetry(
  briefId: string
): Promise<BriefActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "You must be signed in." };

  const { data: existing } = await supabase
    .from("creative_briefs")
    .select("input, selected_angle_id")
    .eq("id", briefId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return { success: false, error: "Brief not found." };

  const input = existing.input as BriefWizardInput;
  const now = new Date().toISOString();
  const generationPhase = existing.selected_angle_id
    ? "full_brief"
    : input.angleMode === "surprise_me"
      ? "angles"
      : "full_brief";

  const { data: brief, error } = await supabase
    .from("creative_briefs")
    .update({
      status: "processing",
      generation_phase: generationPhase,
      error_message: null,
      processing_started_at: now,
      updated_at: now,
    })
    .eq("id", briefId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  return { success: true, brief: brief as CreativeBrief };
}

export type DeleteBriefResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteBrief(briefId: string): Promise<DeleteBriefResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "You must be signed in." };

  const { error } = await supabase
    .from("creative_briefs")
    .delete()
    .eq("id", briefId)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/brief");
  revalidatePath("/dashboard");

  return { success: true };
}
