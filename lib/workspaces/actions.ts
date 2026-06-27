"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types/workspace";
import { normalizeBrandUrl, validateWorkspaceInput } from "@/lib/workspaces/validation";
import { evaluateAccountState, countAccountWorkspaces } from "@/lib/billing/account";
import {
  getAccountWorkspaceLimit,
  isUnlimitedLimit,
} from "@/lib/billing/feature-limits";

export type WorkspaceActionResult =
  | { success: true; workspace: Workspace }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function createWorkspace(
  name: string,
  brandUrl: string,
  options?: { skipOnboarding?: boolean }
): Promise<WorkspaceActionResult> {
  void options?.skipOnboarding;
  const fieldErrors = validateWorkspaceInput(name, brandUrl);

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, error: "Please fix the errors below.", fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const state = await evaluateAccountState(user.id);
  if (!state.isAdmin) {
    const workspaceLimit = await getAccountWorkspaceLimit(
      user.id,
      state.account_status,
      state.stripe_subscription_id
    );
    if (!isUnlimitedLimit(workspaceLimit)) {
      const owned = await countAccountWorkspaces(user.id);
      if (owned >= workspaceLimit) {
        const message =
          state.account_status === "trialing"
            ? `Your free trial includes ${workspaceLimit} workspace${workspaceLimit === 1 ? "" : "s"}. Upgrade to add more brands.`
            : state.account_status === "active"
              ? `Your plan includes ${workspaceLimit} workspace${workspaceLimit === 1 ? "" : "s"}. Upgrade to add more brands.`
              : "Upgrade your plan to add more brand workspaces.";
        return { success: false, error: message };
      }
    }
  }

  const normalizedUrl = normalizeBrandUrl(brandUrl);

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      user_id: user.id,
      name: name.trim(),
      brand_url: normalizedUrl,
    })
    .select("*")
    .single();

  if (workspaceError) {
    return { success: false, error: workspaceError.message };
  }

  const profileUpdate = {
    active_workspace_id: workspace.id,
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  revalidatePath("/settings");
  revalidatePath("/brand");

  return { success: true, workspace: workspace as Workspace };
}

export async function setActiveWorkspace(
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!workspace) {
    return { success: false, error: "Workspace not found." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      active_workspace_id: workspaceId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/brand");

  return { success: true };
}

export async function completeOnboarding(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  return { success: true };
}
