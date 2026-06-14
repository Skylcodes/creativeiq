import { createClient } from "@/lib/supabase/server";
import type { Profile, Workspace } from "@/lib/types/workspace";

export async function getOrCreateProfile(userId: string): Promise<Profile> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    return existing as Profile;
  }

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return created as Profile;
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Workspace[];
}

export async function getActiveWorkspace(
  userId: string
): Promise<{ profile: Profile; workspace: Workspace | null; workspaces: Workspace[] }> {
  const profile = await getOrCreateProfile(userId);
  const workspaces = await getUserWorkspaces(userId);

  const workspace =
    workspaces.find((w) => w.id === profile.active_workspace_id) ??
    workspaces[0] ??
    null;

  return { profile, workspace, workspaces };
}
