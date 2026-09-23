"use server";

import { revalidatePath } from "next/cache";
import {
  ANALYSIS_PLATFORMS,
  COMPARISON_PLATFORMS,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/analyses/constants";
import {
  ALLOWED_CREATIVE_MIME_TYPES,
  assertUploadedCreativeAllowed,
} from "@/lib/analyses/creative-storage";
import { normalizeLandingPageUrl } from "@/lib/analyses/validation";
import { createClient } from "@/lib/supabase/server";
import { assertActionAllowed, blockedActionResult } from "@/lib/billing/gate";
import type { ActionBlocked } from "@/lib/billing/account-types";
import type { Analysis, CreateAnalysisInput } from "@/lib/types/analysis";
import type {
  ComparisonTestDimension,
  CreateComparisonInput,
  StoredAnalysisVariant,
} from "@/lib/types/comparison";
import { randomUUID } from "crypto";

function validateCreativeMime(
  creativeType: CreateAnalysisInput["creativeType"],
  mime: string | null | undefined
): string | null {
  if (creativeType === "script") return null;
  if (!mime) {
    return "Creative MIME type is required for image/video uploads.";
  }
  const allowed =
    creativeType === "image"
      ? ALLOWED_CREATIVE_MIME_TYPES.image
      : ALLOWED_CREATIVE_MIME_TYPES.video;
  if (!(allowed as readonly string[]).includes(mime)) {
    return creativeType === "video"
      ? "Only MP4 videos are supported."
      : "Only JPG and PNG images are supported.";
  }
  return null;
}

export type AnalysisActionResult =
  | { success: true; analysis: Analysis }
  | { success: false; error: string; blocked?: ActionBlocked };

function buildAnalysisTitle(platforms: string[], platformOther?: string): string {
  const labels = platforms
    .map((id) => {
      if (id === "other" && platformOther?.trim()) {
        return platformOther.trim();
      }
      return ANALYSIS_PLATFORMS.find((p) => p.id === id)?.label ?? id;
    })
    .filter(Boolean);

  if (labels.length === 0) return "Funnel Analysis";
  if (labels.length === 1) return `${labels[0]} Analysis`;
  if (labels.length === 2) return `${labels[0]} · ${labels[1]} Analysis`;
  return `${labels[0]} +${labels.length - 1} Analysis`;
}

export async function createAnalysis(
  input: CreateAnalysisInput
): Promise<AnalysisActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const gate = await assertActionAllowed(user.id, "funnel_analyses");
  if (!gate.allowed) return blockedActionResult(gate);

  if (input.platforms.length === 0) {
    return { success: false, error: "Select at least one platform." };
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", input.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!workspace) {
    return { success: false, error: "Workspace not found." };
  }

  const mimeError = validateCreativeMime(
    input.creativeType,
    input.creativeMimeType
  );
  if (mimeError) {
    return { success: false, error: mimeError };
  }

  if (
    (input.creativeType === "image" || input.creativeType === "video") &&
    input.creativeStoragePath
  ) {
    const maxBytes =
      input.creativeType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    const check = await assertUploadedCreativeAllowed(
      supabase,
      input.creativeStoragePath,
      input.creativeType,
      maxBytes
    );
    if (!check.ok) {
      return { success: false, error: check.error };
    }
  }

  if (
    (input.creativeType === "image" || input.creativeType === "video") &&
    !input.creativeStoragePath
  ) {
    return { success: false, error: "Upload a creative file before running analysis." };
  }

  const title = buildAnalysisTitle(input.platforms, input.platformOther);
  const landingPageUrl = normalizeLandingPageUrl(input.landingPageUrl);

  const now = new Date().toISOString();

  const { data: analysis, error } = await supabase
    .from("analyses")
    .insert({
      workspace_id: input.workspaceId,
      user_id: user.id,
      title,
      creative_goal: input.creativeGoal,
      creative_type: input.creativeType,
      platforms: input.platforms,
      platform_other: input.platformOther?.trim() || null,
      landing_page_url: landingPageUrl,
      script_content: input.scriptContent?.trim() || null,
      creative_storage_path: input.creativeStoragePath || null,
      creative_file_name: input.creativeFileName || null,
      creative_mime_type: input.creativeMimeType || null,
      thumbnail_url: input.thumbnailUrl || null,
      status: "processing",
      processing_started_at: now,
      funnel_score: null,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/analyses");

  return { success: true, analysis: analysis as Analysis };
}

function buildComparisonTitle(
  variantCount: number,
  platform: string,
  platformOther?: string
): string {
  const label =
    platform === "other" && platformOther?.trim()
      ? platformOther.trim()
      : COMPARISON_PLATFORMS.find((p) => p.id === platform)?.label ??
        ANALYSIS_PLATFORMS.find((p) => p.id === platform)?.label ??
        platform;
  return `${variantCount}-Variant Comparison · ${label}`;
}

export async function createComparisonAnalysis(
  input: CreateComparisonInput
): Promise<AnalysisActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const gate = await assertActionAllowed(user.id, "variant_comparisons");
  if (!gate.allowed) return blockedActionResult(gate);

  if (input.variants.length < 2 || input.variants.length > 4) {
    return { success: false, error: "Upload 2 to 4 variants to compare." };
  }

  if (input.testDimensions.length === 0) {
    return { success: false, error: "Select at least one element to test." };
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", input.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!workspace) {
    return { success: false, error: "Workspace not found." };
  }

  for (const v of input.variants) {
    const mimeError = validateCreativeMime(v.creativeType, v.creativeMimeType);
    if (mimeError) {
      return { success: false, error: `${v.label || "Variant"}: ${mimeError}` };
    }
    if (
      (v.creativeType === "image" || v.creativeType === "video") &&
      !v.creativeStoragePath
    ) {
      return {
        success: false,
        error: `${v.label || "Variant"}: upload a creative file before running.`,
      };
    }
    if (
      (v.creativeType === "image" || v.creativeType === "video") &&
      v.creativeStoragePath
    ) {
      const maxBytes =
        v.creativeType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      const check = await assertUploadedCreativeAllowed(
        supabase,
        v.creativeStoragePath,
        v.creativeType,
        maxBytes
      );
      if (!check.ok) {
        return {
          success: false,
          error: `${v.label || "Variant"}: ${check.error}`,
        };
      }
    }
  }

  const storedVariants: StoredAnalysisVariant[] = input.variants.map(
    (v, i) => ({
      id: randomUUID(),
      label: v.label.trim() || `Variant ${i + 1}`,
      creative_type: v.creativeType,
      script_content: v.scriptContent?.trim() || null,
      creative_storage_path: v.creativeStoragePath || null,
      creative_file_name: v.creativeFileName || null,
      creative_mime_type: v.creativeMimeType || null,
      thumbnail_url: v.thumbnailUrl || null,
    })
  );

  const first = storedVariants[0];
  const title = buildComparisonTitle(
    storedVariants.length,
    input.platform,
    input.platformOther
  );
  const landingPageUrl = normalizeLandingPageUrl(input.landingPageUrl);
  const now = new Date().toISOString();

  const { data: analysis, error } = await supabase
    .from("analyses")
    .insert({
      workspace_id: input.workspaceId,
      user_id: user.id,
      title,
      creative_goal: input.creativeGoal,
      analysis_mode: "comparison",
      comparison_test_dimensions: input.testDimensions as ComparisonTestDimension[],
      variants: storedVariants,
      creative_type: input.creativeType,
      platforms: [input.platform],
      platform_other: input.platformOther?.trim() || null,
      landing_page_url: landingPageUrl,
      script_content: first.script_content,
      creative_storage_path: first.creative_storage_path,
      creative_file_name: first.creative_file_name,
      creative_mime_type: first.creative_mime_type,
      thumbnail_url: first.thumbnail_url,
      status: "processing",
      processing_started_at: now,
      funnel_score: null,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/analyses");

  return { success: true, analysis: analysis as Analysis };
}

/**
 * Resets a failed analysis back to "processing" so the user can re-run it.
 * The client then re-triggers POST /api/analyses/[id]/run.
 * Fails if the creative was already purged from storage after a failed run —
 * user must start a new analysis with a fresh upload.
 */
export async function resetAnalysisForRetry(
  analysisId: string
): Promise<AnalysisActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("analyses")
    .select("id, creative_type, creative_storage_path, variants")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }
  if (!existing) {
    return { success: false, error: "Analysis not found." };
  }

  const needsFile =
    existing.creative_type === "image" || existing.creative_type === "video";
  if (needsFile) {
    const variants = (existing.variants ?? []) as StoredAnalysisVariant[];
    const hasPath =
      Boolean(existing.creative_storage_path) ||
      variants.some((v) => Boolean(v.creative_storage_path));
    if (!hasPath) {
      return {
        success: false,
        error:
          "The uploaded creative was removed after the failed run. Start a new analysis and upload the file again.",
      };
    }
  }

  const now = new Date().toISOString();

  const { data: analysis, error } = await supabase
    .from("analyses")
    .update({
      status: "processing",
      error_message: null,
      processing_started_at: now,
      updated_at: now,
    })
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, analysis: analysis as Analysis };
}

export async function failAnalysis(
  analysisId: string,
  message?: string
): Promise<AnalysisActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: analysis, error } = await supabase
    .from("analyses")
    .update({
      status: "failed",
      error_message: message?.slice(0, 500) ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return { success: false, error: message ?? error.message };
  }

  return { success: true, analysis: analysis as Analysis };
}

export type DeleteAnalysisResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteAnalysis(
  analysisId: string
): Promise<DeleteAnalysisResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: analysis, error: fetchError } = await supabase
    .from("analyses")
    .select("id, creative_storage_path, thumbnail_url, variants")
    .eq("id", analysisId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!analysis) {
    return { success: false, error: "Analysis not found." };
  }

  const pathsToRemove = new Set<string>();
  if (analysis.creative_storage_path) {
    pathsToRemove.add(analysis.creative_storage_path);
  }

  if (analysis.thumbnail_url) {
    const thumbPath = analysis.thumbnail_url.match(
      /analysis-creatives\/(.+?)(?:\?|$)/
    )?.[1];
    if (thumbPath) pathsToRemove.add(thumbPath);
  }

  const variants = (analysis.variants ?? []) as StoredAnalysisVariant[];
  for (const v of variants) {
    if (v.creative_storage_path) pathsToRemove.add(v.creative_storage_path);
    if (v.thumbnail_url) {
      const thumbPath = v.thumbnail_url.match(
        /analysis-creatives\/(.+?)(?:\?|$)/
      )?.[1];
      if (thumbPath) pathsToRemove.add(thumbPath);
    }
  }

  if (pathsToRemove.size > 0) {
    await supabase.storage
      .from("analysis-creatives")
      .remove([...pathsToRemove]);
  }

  const { error: deleteError } = await supabase
    .from("analyses")
    .delete()
    .eq("id", analysisId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/analyses");

  return { success: true };
}
