import { createClient } from "@/lib/supabase/server";
import type { AccountSettingsData, WorkspaceWithStats } from "@/lib/types/workspace";
import { getOrCreateProfile, getUserWorkspaces } from "@/lib/workspaces/queries";
import type { User } from "@supabase/supabase-js";

export async function getAccountSettingsData(
  user: User
): Promise<AccountSettingsData> {
  const supabase = await createClient();
  const profile = await getOrCreateProfile(user.id);
  const workspaces = await getUserWorkspaces(user.id);

  const workspacesWithCounts: WorkspaceWithStats[] = await Promise.all(
    workspaces.map(async (workspace) => {
      const { count, error } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id);

      if (error) {
        throw new Error(error.message);
      }

      return {
        ...workspace,
        analysis_count: count ?? 0,
      };
    })
  );

  const fullName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "User";

  return {
    email: user.email ?? "",
    fullName,
    avatarUrl: profile.avatar_url,
    workspaces: workspacesWithCounts,
    activeWorkspaceId: profile.active_workspace_id,
  };
}
