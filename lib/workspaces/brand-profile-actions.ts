"use server";

import { revalidatePath } from "next/cache";
import { formToProfile, type BrandProfileForm } from "@/lib/brand-profile/form";
import { normalizeLegacyProfile } from "@/lib/brand-profile/normalize";
import { createClient } from "@/lib/supabase/server";
import type { BrandProfile } from "@/lib/types/report";
import type { Workspace } from "@/lib/types/workspace";
import {
  isValidBrandUrl,
  normalizeBrandUrl,
} from "@/lib/workspaces/validation";

export type SaveBrandProfileResult =
  | {
      success: true;
      profile: BrandProfile;
      updatedAt: string;
      workspaceName: string;
      websiteUrl: string;
    }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function saveBrandProfile(
  workspaceId: string,
  form: BrandProfileForm
): Promise<SaveBrandProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const fieldErrors: Record<string, string> = {};

  if (!form.brandName.trim()) {
    fieldErrors.brandName = "Brand name is required.";
  }

  if (!form.websiteUrl.trim()) {
    fieldErrors.websiteUrl = "Website URL is required.";
  } else if (!isValidBrandUrl(form.websiteUrl)) {
    fieldErrors.websiteUrl = "Enter a valid website URL.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors,
    };
  }

  const { data: workspaceRow, error: fetchError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !workspaceRow) {
    return { success: false, error: "Workspace not found." };
  }

  const workspace = workspaceRow as Workspace;
  const websiteUrl = normalizeBrandUrl(form.websiteUrl);
  const existingProfile = workspace.brand_profile
    ? normalizeLegacyProfile(workspace.brand_profile)
    : null;

  const profile = formToProfile(form, existingProfile, websiteUrl);
  const updatedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("workspaces")
    .update({
      name: form.brandName.trim(),
      brand_url: websiteUrl,
      brand_profile: profile,
      brand_profile_generated_at: updatedAt,
      brand_profile_status: "complete",
      brand_profile_error: null,
      updated_at: updatedAt,
    })
    .eq("id", workspaceId)
    .eq("user_id", user.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/brand");
  revalidatePath("/dashboard");

  return {
    success: true,
    profile,
    updatedAt,
    workspaceName: form.brandName.trim(),
    websiteUrl,
  };
}
