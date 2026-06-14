"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionResult =
  | { success: true }
  | { success: false; error: string };

export async function updateProfileName(
  fullName: string
): Promise<SettingsActionResult> {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { success: false, error: "Full name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase.auth.updateUser({
    data: { full_name: trimmed },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/brand");

  return { success: true };
}

export async function updateAvatarUrl(
  avatarUrl: string
): Promise<SettingsActionResult> {
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
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/brand");
  revalidatePath("/analyses");

  return { success: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<SettingsActionResult> {
  if (newPassword.length < 8) {
    return {
      success: false,
      error: "New password must be at least 8 characters.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "You must be signed in." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { success: false, error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function signOutOtherSessions(): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { error } = await supabase.auth.signOut({ scope: "others" });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteWorkspace(
  workspaceId: string
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  const { data: workspace, error: fetchError } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!workspace) {
    return { success: false, error: "Workspace not found." };
  }

  const { data: allWorkspaces } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if ((allWorkspaces?.length ?? 0) <= 1) {
    return {
      success: false,
      error: "You must keep at least one workspace.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_workspace_id")
    .eq("id", user.id)
    .maybeSingle();

  const { error: deleteError } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  if (profile?.active_workspace_id === workspaceId) {
    const fallback = allWorkspaces?.find((w) => w.id !== workspaceId);
    await supabase
      .from("profiles")
      .update({
        active_workspace_id: fallback?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/brand");
  revalidatePath("/analyses");

  return { success: true };
}
