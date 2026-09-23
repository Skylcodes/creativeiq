"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/analyses/constants";
import {
  ALLOWED_CREATIVE_MIME_TYPES,
  assertUploadedCreativeAllowed,
} from "@/lib/analyses/creative-storage";
import {
  normalizeLandingPageUrl,
  validateLandingPageUrl,
} from "@/lib/analyses/validation";
import { assertActionAllowed, blockedActionResult } from "@/lib/billing/gate";
import type { ActionBlocked } from "@/lib/billing/account-types";
import type {
  AdDeconstruction,
  CreateDeconstructionInput,
  DeconstructionInput,
} from "@/lib/types/deconstruction";

export type DeconstructionActionResult =
  | { success: true; deconstruction: AdDeconstruction }
  | { success: false; error: string; blocked?: ActionBlocked };

function buildTitle(input: DeconstructionInput): string {
  try {
    const host = new URL(
      input.landingPageUrl.startsWith("http")
        ? input.landingPageUrl
        : `https://${input.landingPageUrl}`
    ).hostname.replace(/^www\./, "");
    return `${host} · Ad Deconstruction`;
  } catch {
    return input.creativeFileName
      ? `${input.creativeFileName} · Deconstruction`
      : "Ad Deconstruction";
  }
}

export async function createDeconstruction(
  input: CreateDeconstructionInput
): Promise<DeconstructionActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "You must be signed in." };

  const gate = await assertActionAllowed(user.id, "ad_deconstructions");
  if (!gate.allowed) return blockedActionResult(gate);

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", input.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!workspace) return { success: false, error: "Workspace not found." };

  const lpError = validateLandingPageUrl(input.input.landingPageUrl);
  if (lpError) return { success: false, error: lpError };

  if (!input.input.creativeStoragePath) {
    return { success: false, error: "Upload the ad creative file." };
  }

  const creativeType = input.input.creativeType;
  const mime = input.input.creativeMimeType;
  const allowed =
    creativeType === "image"
      ? ALLOWED_CREATIVE_MIME_TYPES.image
      : ALLOWED_CREATIVE_MIME_TYPES.video;
  if (mime && !(allowed as readonly string[]).includes(mime)) {
    return {
      success: false,
      error:
        creativeType === "video"
          ? "Only MP4 videos are supported."
          : "Only JPG and PNG images are supported.",
    };
  }

  const maxBytes =
    creativeType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const check = await assertUploadedCreativeAllowed(
    supabase,
    input.input.creativeStoragePath,
    creativeType,
    maxBytes
  );
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const normalizedInput: DeconstructionInput = {
    ...input.input,
    landingPageUrl: normalizeLandingPageUrl(input.input.landingPageUrl),
  };

  const now = new Date().toISOString();
  const title = buildTitle(normalizedInput);

  const { data: row, error } = await supabase
    .from("ad_deconstructions")
    .insert({
      workspace_id: input.workspaceId,
      user_id: user.id,
      title,
      status: "processing",
      input: normalizedInput,
      processing_started_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/deconstructor");
  revalidatePath("/dashboard");

  return { success: true, deconstruction: row as AdDeconstruction };
}

export async function deleteDeconstruction(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "You must be signed in." };

  const { data: existing } = await supabase
    .from("ad_deconstructions")
    .select("input")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return { success: false, error: "Not found." };

  const rowInput = existing.input as DeconstructionInput;
  if (rowInput.creativeStoragePath) {
    await supabase.storage
      .from("analysis-creatives")
      .remove([rowInput.creativeStoragePath]);
  }

  const { error } = await supabase
    .from("ad_deconstructions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/deconstructor");
  return { success: true };
}
